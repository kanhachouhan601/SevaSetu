// src/controllers/request.controller.js
const Request = require('../models/Request');
const Notification = require('../models/Notification');
const NurseProfile = require('../models/NurseProfile');
const User = require('../models/User');
const SafetyAlert = require('../models/SafetyAlert');
const { callAI } = require('../services/aiProvider.service');

const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const normalizeLocation = (location = {}) => {
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return {
    lat,
    lng,
    accuracy: Number(location.accuracy) || undefined,
    capturedAt: new Date(),
  };
};

const distanceKm = (from, to) => {
  if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) return null;
  const toRad = value => (Number(value) * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateRide = (nurseLocation, patientLocation) => {
  const km = distanceKm(nurseLocation, patientLocation);
  if (!Number.isFinite(km)) return { distanceKm: null, minutes: 45 };
  return {
    distanceKm: Number(km.toFixed(1)),
    minutes: Math.max(12, Math.ceil((km / 22) * 60) + 8),
  };
};

const parseAiJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const json = text.match(/\{[\s\S]*\}/);
    if (!json) throw new Error('AI returned invalid interview format.');
    return JSON.parse(json[0]);
  }
};

const notifyAdmins = async ({ message, requestId, safetyAlertId, type = 'system' }) => {
  const admins = await User.find({ role: 'admin' }).select('_id');
  if (!admins.length) return;

  await Notification.insertMany(admins.map(admin => ({
    userId: admin._id,
    message,
    type,
    metadata: { requestId, safetyAlertId },
  })));
};

const SPECIALIZATION_RULES = [
  { spec: 'ICU', terms: ['icu', 'critical', 'ventilator', 'oxygen', 'breathing', 'saans', 'cancer'] },
  { spec: 'Emergency', terms: ['emergency', 'urgent', 'bleeding', 'breathless', 'saans', 'stroke', 'chest pain'] },
  { spec: 'Wound Care', terms: ['wound', 'dressing', 'surgery', 'operation', 'injury', 'ulcer', 'bedsore'] },
  { spec: 'Elder Care', terms: ['elder', 'old', 'senior', 'paralysis', 'paralysed', 'stroke', 'dementia'] },
  { spec: 'Physiotherapy', terms: ['physio', 'paralysis', 'walking', 'mobility', 'exercise', 'rehab'] },
  { spec: 'Pediatric', terms: ['child', 'baby', 'kid', 'pediatric', 'infant'] },
  { spec: 'General Care', terms: ['bp', 'fever', 'injection', 'medicine', 'monitoring', 'care'] },
];

const inferRequiredSpecializations = (problem = '', mode = 'temporary') => {
  const text = problem.toLowerCase();
  const matched = SPECIALIZATION_RULES
    .filter(rule => rule.terms.some(term => text.includes(term)))
    .map(rule => rule.spec);

  if (mode === 'longterm' && /cancer|paralysis|stroke|bedridden|icu|critical/.test(text)) {
    matched.push('ICU', 'Elder Care');
  }

  return [...new Set(matched.length ? matched : ['General Care'])];
};

const estimateServiceAmount = ({ problem = '', requirements = '', mode = 'temporary', createdAt = new Date() }) => {
  const text = `${problem} ${requirements}`.toLowerCase();
  const hour = new Date(createdAt).getHours();
  let amount = mode === 'longterm' ? 1200 : 500;

  if (/icu|critical|ventilator|oxygen|breathing|saans|stroke|chest pain/.test(text)) amount += 500;
  if (/wound|dressing|surgery|operation|bedsore|catheter/.test(text)) amount += 250;
  if (/injection|iv|drip|medicine|bp|monitoring/.test(text)) amount += 150;
  if (hour >= 20 || hour < 6 || /night|late night|overnight/.test(text)) amount += 300;
  if (mode === 'longterm' && /bedridden|paralysis|cancer|dementia|elder/.test(text)) amount += 500;

  return Math.min(amount, mode === 'longterm' ? 2500 : 1500);
};

const inferSafetyReview = ({ problem = '', requirements = '', mode = 'temporary', patient = {}, createdAt = new Date() }) => {
  const text = `${problem} ${requirements}`.toLowerCase();
  const hour = new Date(createdAt).getHours();
  const reasons = [];
  if (patient?.safety?.unsafeFlag) reasons.push('patient has previous unsafe flag');
  if (hour >= 20 || hour < 6) reasons.push('night visit');
  if (/alone|male attendant|harass|unsafe|alcohol|drunk|violence|late night/.test(text)) reasons.push('safety-sensitive requirement');
  if (mode === 'longterm' && /critical|icu|cancer|paralysis|stroke|bedridden/.test(text)) reasons.push('high dependency long-term case');
  if (!patient?.safety?.addressVerified) reasons.push('address not verified');
  return {
    required: reasons.length > 0,
    reason: reasons.join(', '),
  };
};

const requiresAdminApprovalBeforeFemaleAssignment = (safetyReview = {}) => {
  if (!safetyReview.required || safetyReview.approved) return false;
  const reason = String(safetyReview.reason || '').toLowerCase();
  const highRiskReasons = [
    'patient has previous unsafe flag',
    'night visit',
    'safety-sensitive requirement',
    'high dependency long-term case',
  ];
  return highRiskReasons.some(item => reason.includes(item));
};

const scoreNurseForRequest = (profile, { requiredSpecs, city, mode, patientLocation }) => {
  const nurseSpecs = profile.specializations || [];
  const specMatches = requiredSpecs.filter(spec => nurseSpecs.includes(spec)).length;
  const documentScore = Object.values(profile.documents || {}).filter(Boolean).length;
  const cityMatch = city && (
    profile.location?.city?.toLowerCase() === city.toLowerCase() ||
    profile.userId?.city?.toLowerCase() === city.toLowerCase()
  );

  let score = 0;
  score += specMatches * 35;
  score += Math.min(Number(profile.experience || 0), 10) * (mode === 'longterm' ? 4 : 2);
  score += Number(profile.interviewScore || 0) * 3;
  score += Number(profile.rating || 0) * 5;
  score += documentScore * 5;
  if (cityMatch) score += 15;
  if (mode === 'temporary') {
    const km = distanceKm(profile.currentLocation, patientLocation);
    if (Number.isFinite(km)) score += Math.max(0, 80 - km * 8);
  }

  return score;
};

const shortlistNursesForRequest = async ({ problem, mode, city, patientLocation }) => {
  const requiredSpecs = inferRequiredSpecializations(problem, mode);
  const nurses = await NurseProfile.find({
    status: 'approved',
    availability: true,
  }).populate('userId', 'name email phone city');

  const ranked = nurses
    .map(profile => ({
      profile,
      score: scoreNurseForRequest(profile, { requiredSpecs, city, mode, patientLocation }),
      distanceKm: distanceKm(profile.currentLocation, patientLocation),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (mode === 'temporary' && Number.isFinite(a.distanceKm) && Number.isFinite(b.distanceKm)) {
        return a.distanceKm - b.distanceKm;
      }
      return b.score - a.score;
    });

  const shortlistSize = mode === 'longterm' ? 3 : 5;
  const shortlisted = ranked.slice(0, shortlistSize);

  return {
    requiredSpecs,
    shortlisted,
    matchingReason: mode === 'temporary'
      ? `Nearest available nurses matched for ${requiredSpecs.join(', ')} using location, specialization, experience and city fit.`
      : `Matched for ${requiredSpecs.join(', ')} using specialization, experience, documents, interview score and city fit.`,
  };
};

const formatDateTime = (date) => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
}).format(date);

const LONGTERM_INTERVIEW_QUESTION_PROMPT = `You are an AI clinical interviewer conducting a real long-term home-care nurse interview in India.

Generate exactly 5 patient-specific clinical interview questions for the nurse.
Return JSON only: {"questions":["..."]}

Rules:
- Questions must be based on the patient problem and long-term care needs.
- Include safety, escalation, monitoring, family communication, and specialization fit.
- Questions should be practical scenario questions, not theory.
- Use simple Hindi in Devanagari script so browser Hindi voice can pronounce it clearly.
- Do not provide answers.`;

const LONGTERM_INTERVIEW_FINAL_PROMPT = `You are the final AI assessor for selecting a nurse for a long-term home-care patient.

Evaluate the nurse's full answers against the patient requirement. Be strict and patient-safety-first.

Return JSON only:
{
  "passed": true/false,
  "score": 0-10,
  "feedback": "2-4 sentence assessment",
  "criticalFailReason": "only if unsafe"
}

Pass only if score is 7 or above and there is no critical safety failure.`;

// ─── POST /api/request ────────────────────────────────────────
const createRequest = async (req, res) => {
  try {
    const {
      mode,
      problem,
      address,
      city,
      patientAge,
      patientPhone,
      aiSummary,
      triageLevel,
      amount,
      notes,
      requirements,
      patientLocation,
    } = req.body;

    if (!mode || !problem) {
      return res.status(400).json({ error: 'Mode and problem description are required.' });
    }

    const patient = await User.findById(req.user._id).select('safety city phone');
    const safetyReview = inferSafetyReview({
      problem,
      requirements,
      mode,
      patient,
    });

    let parsedPatientLocation = patientLocation;
    if (typeof patientLocation === 'string') {
      try {
        parsedPatientLocation = JSON.parse(patientLocation);
      } catch {
        parsedPatientLocation = {};
      }
    }
    const normalizedPatientLocation = normalizeLocation(parsedPatientLocation);

    const matchResult = await shortlistNursesForRequest({
      problem: `${problem} ${requirements || ''}`,
      mode,
      city: city || req.user.city,
      patientLocation: normalizedPatientLocation,
    });
    const requestedAmount = Number(amount);
    const serviceAmount = Number.isFinite(requestedAmount) && requestedAmount > 0
      ? requestedAmount
      : estimateServiceAmount({ problem, requirements, mode });

    const attachmentSources = Array.isArray(req.body.attachmentSources)
      ? req.body.attachmentSources
      : req.body.attachmentSources ? [req.body.attachmentSources] : [];

    const attachments = (req.files || []).map((file, index) => ({
      originalName: file.originalname,
      filename: file.filename,
      url: `/uploads/requests/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      source: attachmentSources[index] || 'file',
    }));

    const serviceRequest = await Request.create({
      patientId: req.user._id,
      mode,
      problem,
      address,
      city: city || req.user.city,
      patientAge,
      patientPhone: patientPhone || req.user.phone,
      aiSummary,
      triageLevel: triageLevel || 'medium',
      safetyReview,
      amount: serviceAmount,
      notes,
      requirements,
      attachments,
      rideTracking: {
        patientLocation: normalizedPatientLocation,
        lastStatus: mode === 'temporary' ? 'Looking for nearest available nurse' : undefined,
      },
      visit: {
        checkInOtp: makeOtp(),
        checkOutOtp: makeOtp(),
      },
      shortlistedNurseIds: matchResult.shortlisted.map(item => item.profile.userId._id || item.profile.userId),
      matchingReason: matchResult.matchingReason,
      matchingScores: Object.fromEntries(
        matchResult.shortlisted.map(item => [
          String(item.profile.userId._id || item.profile.userId),
          item.score,
        ])
      ),
    });

    if (safetyReview.required) {
      const alert = await SafetyAlert.create({
        requestId: serviceRequest._id,
        patientId: req.user._id,
        nurseId: null,
        type: 'manual_review',
        severity: 'medium',
        message: `Safety review required: ${safetyReview.reason}`,
      });
      await notifyAdmins({
        message: `Safety review required for a new request: ${safetyReview.reason}`,
        requestId: serviceRequest._id,
        safetyAlertId: alert._id,
      });
    }

    // Notify patient
    await Notification.create({
      userId: req.user._id,
      message: matchResult.shortlisted.length
        ? `Your ${mode === 'longterm' ? 'long-term' : 'temporary'} request is submitted. Estimated service amount: ₹${serviceAmount}. We shortlisted ${matchResult.shortlisted.length} qualified nurse(s).${safetyReview.required ? ' Safety review is enabled for this visit.' : ''}`
        : `Your request is submitted, but no matching nurse is available right now. We will keep looking.`,
      type: 'request_created',
      metadata: { requestId: serviceRequest._id },
    });

    if (matchResult.shortlisted.length > 0) {
      await Notification.insertMany(
        matchResult.shortlisted.map(({ profile, score }) => ({
          userId: profile.userId._id || profile.userId,
          message: mode === 'longterm'
            ? `Long-term patient request shortlisted for you. Estimated amount: ₹${serviceAmount}. If you accept, a 25-30 min AI video interview will be scheduled. Match score: ${Math.round(score)}.`
            : `Temporary patient request matched for you. Estimated amount: ₹${serviceAmount}. Accept only if you can reach the patient soon. Match score: ${Math.round(score)}.`,
          type: 'request_created',
          metadata: { requestId: serviceRequest._id, matchScore: score, mode, amount: serviceAmount },
        }))
      );
    }

    const populated = await Request.findById(serviceRequest._id)
      .populate('patientId', 'name email phone')
      .populate('nurseId', 'name email phone');

    res.status(201).json({ success: true, request: populated });
  } catch (error) {
    console.error('[Request Create]', error);
    res.status(500).json({ error: 'Failed to create request.' });
  }
};

// ─── GET /api/request/patient ─────────────────────────────────
const getPatientRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { patientId: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      Request.find(filter)
        .populate('nurseId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Request.countDocuments(filter),
    ]);

    res.json({
      success: true,
      requests,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    console.error('[Request GetPatient]', error);
    res.status(500).json({ error: 'Failed to fetch your requests.' });
  }
};

// ─── GET /api/request/nurse ───────────────────────────────────
const getNurseRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { nurseId: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      Request.find(filter)
        .populate('patientId', 'name email phone address city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Request.countDocuments(filter),
    ]);

    res.json({
      success: true,
      requests,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    console.error('[Request GetNurse]', error);
    res.status(500).json({ error: 'Failed to fetch assigned requests.' });
  }
};

const getRequestForNurseInterview = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('patientId', 'name phone city address')
      .populate('nurseId', 'name email phone');

    if (!request) return res.status(404).json({ error: 'Request not found.' });
    if (req.user.role !== 'nurse' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only nurses can access this interview.' });
    }
    if (request.nurseId?._id?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'This interview is not assigned to you.' });
    }

    res.json({ success: true, request });
  } catch (error) {
    console.error('[Request GetInterview]', error);
    res.status(500).json({ error: 'Failed to fetch interview request.' });
  }
};

const generateLongtermInterviewQuestions = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate('patientId', 'name city');
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    if (request.nurseId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'This interview is not assigned to you.' });
    }
    if (request.status !== 'interview-scheduled') {
      return res.status(400).json({ error: 'Interview is not scheduled for this request.' });
    }

    const now = Date.now();
    const startsAt = request.interviewSchedule?.startsAt ? new Date(request.interviewSchedule.startsAt).getTime() : now;
    const endsAt = request.interviewSchedule?.endsAt ? new Date(request.interviewSchedule.endsAt).getTime() : startsAt + 30 * 60 * 1000;
    if (now < startsAt - 10 * 60 * 1000 || now > endsAt + 10 * 60 * 1000) {
      return res.status(403).json({ error: 'Interview can start only near the scheduled time.' });
    }

    const nurseProfile = await NurseProfile.findOne({ userId: req.user._id }).populate('userId', 'name city');
    const raw = await callAI({
      systemInstruction: LONGTERM_INTERVIEW_QUESTION_PROMPT,
      contents: [{
        role: 'user',
        parts: [{
          text: `Patient request:
Mode: ${request.mode}
Problem: ${request.problem}
Requirements: ${request.requirements || ''}
Address/City: ${request.address || ''} ${request.city || ''}
AI summary: ${request.aiSummary || ''}
Notes: ${request.notes || ''}
Medical attachments: ${request.attachments?.length || 0} file(s)

Nurse:
Name: ${nurseProfile?.userId?.name || req.user.name}
Specializations: ${(nurseProfile?.specializations || []).join(', ')}
Experience: ${nurseProfile?.experience || 0} years
Interview score at registration: ${nurseProfile?.interviewScore || 'not available'}`,
        }],
      }],
      maxOutputTokens: 700,
      temperature: 0.3,
      responseMimeType: 'application/json',
    });

    const parsed = parseAiJson(raw);
    const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 5).filter(Boolean) : [];
    if (questions.length < 5) {
      return res.status(502).json({ error: 'AI could not generate interview questions. Please retry.' });
    }

    res.json({ success: true, questions });
  } catch (error) {
    console.error('[Request InterviewQuestions]', error);
    const status = error.status || (error.message.includes('not configured') ? 503 : 500);
    res.status(status).json({ error: error.message || 'Failed to generate interview questions.' });
  }
};

const submitLongtermInterview = async (req, res) => {
  try {
    const { questions = [], answers = [], proctorWarnings = [] } = req.body;
    const request = await Request.findById(req.params.id).populate('patientId', 'name');
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    if (request.nurseId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'This interview is not assigned to you.' });
    }
    if (request.status !== 'interview-scheduled') {
      return res.status(400).json({ error: 'Interview is not active for this request.' });
    }
    if (!Array.isArray(answers) || answers.length < 5) {
      return res.status(400).json({ error: 'Please answer all interview questions.' });
    }

    const transcript = answers.map((answer, index) => (
      `Question ${index + 1}: ${questions[index] || 'Patient-specific question'}\nAnswer ${index + 1}: ${answer}`
    )).join('\n\n');

    const raw = await callAI({
      systemInstruction: LONGTERM_INTERVIEW_FINAL_PROMPT,
      contents: [{
        role: 'user',
        parts: [{
          text: `Patient long-term care requirement:
${request.problem}
${request.requirements || ''}
Medical attachments shared by patient: ${request.attachments?.length || 0}

Nurse interview transcript:
${transcript}

Camera/proctoring observations:
${Array.isArray(proctorWarnings) && proctorWarnings.length
  ? proctorWarnings.map(w => `- ${w.message || w}`).join('\n')
  : 'No warnings recorded.'}`,
        }],
      }],
      maxOutputTokens: 700,
      temperature: 0.2,
      responseMimeType: 'application/json',
    });

    const parsed = parseAiJson(raw);
    const score = Math.max(0, Math.min(10, parseFloat(parsed.score) || 0));
    const passed = Boolean(parsed.passed) && score >= 7 && !parsed.criticalFailReason;

    if (passed) {
      const eta = new Date(Date.now() + 60 * 60 * 1000);
      const updated = await Request.findByIdAndUpdate(
        request._id,
        {
          $set: {
            status: 'matched',
            arrivalEtaAt: eta,
            notes: `${request.notes || ''}\nLong-term AI interview passed (${score}/10): ${parsed.feedback || ''}`.trim(),
          },
        },
        { new: true }
      ).populate('patientId', 'name email phone').populate('nurseId', 'name email phone');

      await Notification.create({
        userId: request.patientId._id || request.patientId,
        message: `Your long-term nurse has passed the AI clinical interview. Nurse will arrive around ${formatDateTime(eta)}.`,
        type: 'request_matched',
        metadata: { requestId: request._id, score },
      });

      return res.json({ success: true, passed: true, score, feedback: parsed.feedback, request: updated });
    }

    const remainingShortlist = (request.shortlistedNurseIds || [])
      .map(id => id.toString())
      .filter(id => id !== req.user._id.toString());
    const nextNurseId = remainingShortlist[0];

    await Request.findByIdAndUpdate(request._id, {
      $set: {
        status: 'pending',
        nurseId: null,
        shortlistedNurseIds: remainingShortlist,
        notes: `${request.notes || ''}\nLong-term AI interview failed (${score}/10): ${parsed.criticalFailReason || parsed.feedback || ''}`.trim(),
      },
    });

    await Notification.create({
      userId: req.user._id,
      message: `AI interview not cleared for this long-term request. Score: ${score}/10. ${parsed.criticalFailReason || parsed.feedback || ''}`,
      type: 'system',
      metadata: { requestId: request._id, score },
    });

    if (nextNurseId) {
      await Notification.create({
        userId: nextNurseId,
        message: `Long-term patient request is now available for your review. Accept to schedule your AI video interview.`,
        type: 'request_created',
        metadata: { requestId: request._id },
      });
    }

    res.json({ success: true, passed: false, score, feedback: parsed.feedback, criticalFailReason: parsed.criticalFailReason || '' });
  } catch (error) {
    console.error('[Request SubmitInterview]', error);
    const status = error.status || (error.message.includes('not configured') ? 503 : 500);
    res.status(status).json({ error: error.message || 'Failed to submit interview.' });
  }
};

// ─── GET /api/request/open ────────────────────────────────────
const getOpenRequests = async (req, res) => {
  try {
    const { city, page = 1, limit = 20 } = req.query;
    if (req.user.role === 'nurse') {
      const profile = await NurseProfile.findOne({ userId: req.user._id }).select('status availability');
      if (!profile || profile.status !== 'approved') {
        return res.json({
          success: true,
          requests: [],
          pagination: { total: 0, page: parseInt(page), limit: parseInt(limit) },
          message: 'Nurse profile must be approved before receiving patient requests.',
        });
      }
    }

    const filter = {
      status: 'pending',
      $or: [{ nurseId: null }, { nurseId: { $exists: false } }],
    };

    if (req.user.role === 'nurse') {
      filter.$and = [{
        $or: [
          { shortlistedNurseIds: req.user._id },
          { shortlistedNurseIds: { $exists: false } },
          { shortlistedNurseIds: { $size: 0 } },
        ],
      }];
    }
    if (city) filter.city = { $regex: city, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      Request.find(filter)
        .populate('patientId', 'name phone city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Request.countDocuments(filter),
    ]);

    res.json({
      success: true,
      requests,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    console.error('[Request GetOpen]', error);
    res.status(500).json({ error: 'Failed to fetch open requests.' });
  }
};

// ─── PUT /api/request/:id/status ─────────────────────────────
const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, nurseId, amount, notes } = req.body;

    const validStatuses = ['pending', 'matched', 'interview-scheduled', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const serviceRequest = await Request.findById(id);
    if (!serviceRequest) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    // Authorization: patient can cancel own request, nurse can update their request, admin can do anything
    const isAdmin = req.user.role === 'admin';
    const isPatient = serviceRequest.patientId.toString() === req.user._id.toString();
    const isAssignedNurse = serviceRequest.nurseId && serviceRequest.nurseId.toString() === req.user._id.toString();
    const hasShortlist = Array.isArray(serviceRequest.shortlistedNurseIds) && serviceRequest.shortlistedNurseIds.length > 0;
    const isShortlistedNurse = hasShortlist && serviceRequest.shortlistedNurseIds.some(id => id.toString() === req.user._id.toString());
    const isNurseClaimingOpenRequest =
      req.user.role === 'nurse' &&
      status === 'matched' &&
      !serviceRequest.nurseId &&
      serviceRequest.status === 'pending' &&
      (!hasShortlist || isShortlistedNurse);

    if (!isAdmin && !isPatient && !isAssignedNurse && !isNurseClaimingOpenRequest) {
      return res.status(403).json({ error: 'Not authorized to update this request.' });
    }

    if (isNurseClaimingOpenRequest || (req.user.role === 'nurse' && isAssignedNurse)) {
      const profile = await NurseProfile.findOne({ userId: req.user._id }).select('status');
      if (!profile || profile.status !== 'approved') {
        return res.status(403).json({ error: 'Your nurse profile must be approved by admin before handling patient requests.' });
      }
    }

    if (!isAdmin && req.user.role === 'nurse' && isAssignedNurse && status === 'in-progress' && !serviceRequest.visit?.checkedInAt) {
      return res.status(400).json({ error: 'Use patient OTP check-in to start the visit.' });
    }

    if (!isAdmin && req.user.role === 'nurse' && isAssignedNurse && status === 'completed' && !serviceRequest.visit?.checkedOutAt) {
      return res.status(400).json({ error: 'Use patient OTP check-out to complete the visit.' });
    }

    const updates = { status };
    let patientMessageOverride = null;
    let nurseMessage = null;

    if (isNurseClaimingOpenRequest) {
      const claimingNurseProfile = await NurseProfile.findOne({ userId: req.user._id }).select('gender');
      if (
        claimingNurseProfile?.gender === 'female' &&
        requiresAdminApprovalBeforeFemaleAssignment(serviceRequest.safetyReview)
      ) {
        const existingAlert = await SafetyAlert.exists({
          requestId: serviceRequest._id,
          nurseId: req.user._id,
          type: 'manual_review',
          status: 'open',
        });
        if (!existingAlert) {
          const alert = await SafetyAlert.create({
            requestId: serviceRequest._id,
            patientId: serviceRequest.patientId,
            nurseId: req.user._id,
            type: 'manual_review',
            severity: 'high',
            message: `Female nurse assignment needs admin safety review before accepting. Reason: ${serviceRequest.safetyReview.reason || 'safety rule matched'}`,
          });
          await notifyAdmins({
            message: `Female nurse assignment needs safety approval before accepting request. Reason: ${serviceRequest.safetyReview.reason || 'safety rule matched'}`,
            requestId: serviceRequest._id,
            safetyAlertId: alert._id,
          });
        }
        return res.status(403).json({ error: 'This visit needs admin safety review before a female nurse can accept it.' });
      }

      updates.nurseId = req.user._id;

      if (serviceRequest.mode === 'temporary') {
        const liveLocation = normalizeLocation(req.body.location);
        const profileForEta = await NurseProfile.findOne({ userId: req.user._id }).select('currentLocation');
        const nurseLocation = liveLocation || profileForEta?.currentLocation;
        const ride = estimateRide(nurseLocation, serviceRequest.rideTracking?.patientLocation);
        const eta = new Date(Date.now() + ride.minutes * 60 * 1000);
        updates.arrivalEtaAt = eta;
        updates.rideTracking = {
          ...(serviceRequest.rideTracking || {}),
          estimatedDistanceKm: ride.distanceKm,
          estimatedArrivalMinutes: ride.minutes,
          nurseStartLocation: nurseLocation,
          lastStatus: 'Nurse accepted and is on the way',
        };
        if (liveLocation) {
          await NurseProfile.findOneAndUpdate(
            { userId: req.user._id },
            { $set: { currentLocation: liveLocation } }
          );
        }
        patientMessageOverride = `A nurse accepted your temporary request. Estimated arrival: ${formatDateTime(eta)}${ride.distanceKm ? `, about ${ride.distanceKm} km away` : ''}.`;
      }

      if (serviceRequest.mode === 'longterm') {
        const delayMinutes = Number(process.env.LONGTERM_INTERVIEW_DELAY_MINUTES || 60);
        const startsAt = new Date(Date.now() + delayMinutes * 60 * 1000);
        const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
        updates.status = 'interview-scheduled';
        updates.interviewSchedule = {
          startsAt,
          endsAt,
          durationMinutes: 30,
          type: 'ai-video',
          note: 'AI clinical video interview for this long-term care request.',
        };
        patientMessageOverride = `A shortlisted nurse accepted your long-term request. We scheduled a clinical AI interview before final assignment.`;
        nurseMessage = `Your 25-30 min AI video interview is scheduled for ${formatDateTime(startsAt)}. Please be prepared for patient-specific clinical questions.`;
      }
    }
    if (nurseId) updates.nurseId = nurseId;
    if (amount !== undefined) updates.amount = amount;
    if (notes) updates.notes = notes;
    if (status === 'completed') updates.completedAt = new Date();

    const updated = await Request.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate('patientId', 'name email phone')
      .populate('nurseId', 'name email phone');

    // Create notifications based on status change
    const notifMap = {
      matched: { msg: `A nurse has been matched for your request.`, type: 'request_matched' },
      'interview-scheduled': { msg: `A nurse interview has been scheduled for your long-term care request.`, type: 'system' },
      'in-progress': { msg: `Your nurse visit is now in progress.`, type: 'system' },
      completed: { msg: `Your service request has been completed.`, type: 'request_completed' },
      cancelled: { msg: `Your service request has been cancelled.`, type: 'request_cancelled' },
    };

    if (notifMap[status]) {
      await Notification.create({
        userId: serviceRequest.patientId,
        message: patientMessageOverride || notifMap[status].msg,
        type: notifMap[status].type,
        metadata: { requestId: id },
      });
    }

    if (nurseMessage) {
      await Notification.create({
        userId: req.user._id,
        message: nurseMessage,
        type: 'system',
        metadata: { requestId: id, interviewSchedule: updates.interviewSchedule },
      });
    }

    // If completed, update nurse earnings
    if (status === 'completed' && updated.nurseId && updated.amount > 0) {
      await NurseProfile.findOneAndUpdate(
        { userId: updated.nurseId._id || updated.nurseId },
        { $inc: { earnings: updated.amount } }
      );
    }

    res.json({ success: true, request: updated });
  } catch (error) {
    console.error('[Request UpdateStatus]', error);
    res.status(500).json({ error: 'Failed to update request status.' });
  }
};

// ─── POST /api/request/:id/rating ─────────────────────────────
const rateCompletedRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, behavior, careQuality, comment } = req.body;
    const ratingScore = Number(score);

    if (!Number.isFinite(ratingScore) || ratingScore < 1 || ratingScore > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const validQuality = ['excellent', 'good', 'average', 'poor'];
    if (behavior && !validQuality.includes(behavior)) {
      return res.status(400).json({ error: 'Invalid behavior rating.' });
    }
    if (careQuality && !validQuality.includes(careQuality)) {
      return res.status(400).json({ error: 'Invalid care quality rating.' });
    }

    const serviceRequest = await Request.findById(id);
    if (!serviceRequest) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const isPatient = serviceRequest.patientId.toString() === req.user._id.toString();
    if (!isPatient && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the patient can rate this request.' });
    }

    if (serviceRequest.status !== 'completed' || !serviceRequest.nurseId) {
      return res.status(400).json({ error: 'You can rate only after the nurse service is completed.' });
    }

    if (serviceRequest.nurseRating?.ratedAt) {
      return res.status(400).json({ error: 'This request has already been rated.' });
    }

    serviceRequest.nurseRating = {
      score: ratingScore,
      behavior: behavior || null,
      careQuality: careQuality || null,
      comment: comment ? String(comment).trim().slice(0, 500) : '',
      ratedAt: new Date(),
    };
    await serviceRequest.save();

    const profile = await NurseProfile.findOne({ userId: serviceRequest.nurseId });
    if (profile) {
      const previousTotal = Number(profile.totalRatings || 0);
      const previousAverage = Number(profile.rating || 0);
      const nextTotal = previousTotal + 1;
      profile.rating = Number((((previousAverage * previousTotal) + ratingScore) / nextTotal).toFixed(2));
      profile.totalRatings = nextTotal;
      await profile.save();
    }

    await Notification.create({
      userId: serviceRequest.nurseId,
      message: `A patient rated your service ${ratingScore}/5${comment ? `: ${String(comment).trim().slice(0, 120)}` : '.'}`,
      type: 'system',
      metadata: { requestId: id, rating: ratingScore },
    });

    const updated = await Request.findById(id)
      .populate('patientId', 'name email phone')
      .populate('nurseId', 'name email phone');

    res.json({ success: true, request: updated, nurseRating: profile?.rating || ratingScore });
  } catch (error) {
    console.error('[Request RateCompleted]', error);
    res.status(500).json({ error: 'Failed to submit rating.' });
  }
};

const assertAssignedNurse = (request, user) => {
  const isAdmin = user.role === 'admin';
  const isAssignedNurse = request.nurseId && request.nurseId.toString() === user._id.toString();
  return isAdmin || isAssignedNurse;
};

// ─── POST /api/request/:id/safety/sos ─────────────────────────
const raiseSafetySOS = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    if (!assertAssignedNurse(request, req.user)) {
      return res.status(403).json({ error: 'Only assigned nurse can raise SOS.' });
    }

    const location = normalizeLocation(req.body.location);
    const message = req.body.message || 'Nurse raised emergency SOS during patient visit.';
    const alert = await SafetyAlert.create({
      requestId: request._id,
      patientId: request.patientId,
      nurseId: req.user._id,
      type: 'sos',
      severity: 'critical',
      message,
      location,
    });

    const admins = await User.find({ role: 'admin' }).select('_id');
    if (admins.length) {
      await Notification.insertMany(admins.map(admin => ({
        userId: admin._id,
        message: `CRITICAL SOS: ${message}`,
        type: 'system',
        metadata: { requestId: request._id, safetyAlertId: alert._id },
      })));
    }

    await Notification.create({
      userId: request.patientId,
      message: 'Safety SOS was raised for this visit. Admin team has been alerted.',
      type: 'system',
      metadata: { requestId: request._id, safetyAlertId: alert._id },
    });

    res.json({ success: true, alert });
  } catch (error) {
    console.error('[Request SafetySOS]', error);
    res.status(500).json({ error: 'Failed to raise safety SOS.' });
  }
};

// ─── POST /api/request/:id/visit/check-in ─────────────────────
const checkInVisit = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    if (!assertAssignedNurse(request, req.user)) {
      return res.status(403).json({ error: 'Only assigned nurse can check in.' });
    }
    if (request.visit?.checkedInAt) {
      return res.status(400).json({ error: 'Visit already checked in.' });
    }
    if (String(req.body.otp || '') !== String(request.visit?.checkInOtp || '')) {
      return res.status(400).json({ error: 'Invalid check-in OTP.' });
    }

    request.set('visit.checkedInAt', new Date());
    const checkInLocation = normalizeLocation(req.body.location);
    if (checkInLocation) request.set('visit.checkInLocation', checkInLocation);
    request.status = 'in-progress';
    await request.save();

    await Notification.create({
      userId: request.patientId,
      message: 'Nurse checked in for your visit.',
      type: 'system',
      metadata: { requestId: request._id },
    });

    res.json({ success: true, request });
  } catch (error) {
    console.error('[Request CheckIn]', error);
    res.status(500).json({ error: 'Failed to check in.' });
  }
};

// ─── POST /api/request/:id/visit/check-out ────────────────────
const checkOutVisit = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    if (!assertAssignedNurse(request, req.user)) {
      return res.status(403).json({ error: 'Only assigned nurse can check out.' });
    }
    if (!request.visit?.checkedInAt) {
      return res.status(400).json({ error: 'Check-in is required before check-out.' });
    }
    if (request.visit?.checkedOutAt) {
      return res.status(400).json({ error: 'Visit already checked out.' });
    }
    if (String(req.body.otp || '') !== String(request.visit?.checkOutOtp || '')) {
      return res.status(400).json({ error: 'Invalid check-out OTP.' });
    }

    request.set('visit.checkedOutAt', new Date());
    const checkOutLocation = normalizeLocation(req.body.location);
    if (checkOutLocation) request.set('visit.checkOutLocation', checkOutLocation);
    request.status = 'completed';
    request.completedAt = new Date();
    await request.save();

    if (request.nurseId && request.amount > 0) {
      await NurseProfile.findOneAndUpdate(
        { userId: request.nurseId },
        { $inc: { earnings: request.amount } }
      );
    }

    await Notification.create({
      userId: request.patientId,
      message: 'Nurse checked out and your service request is completed. Please rate the nurse care.',
      type: 'request_completed',
      metadata: { requestId: request._id },
    });

    res.json({ success: true, request });
  } catch (error) {
    console.error('[Request CheckOut]', error);
    res.status(500).json({ error: 'Failed to check out.' });
  }
};

// ─── POST /api/request/:id/safety/patient-report ──────────────
const reportPatientBehavior = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    if (!assertAssignedNurse(request, req.user)) {
      return res.status(403).json({ error: 'Only assigned nurse can report patient behavior.' });
    }
    if (request.nursePatientReport?.reportedAt) {
      return res.status(400).json({ error: 'Patient behavior already reported for this request.' });
    }

    const unsafeFlag = Boolean(req.body.unsafeFlag) ||
      req.body.respectful === 'harassment_concern' ||
      req.body.environment === 'unsafe';

    request.nursePatientReport = {
      respectful: req.body.respectful || null,
      environment: req.body.environment || null,
      paymentIssue: Boolean(req.body.paymentIssue),
      familyBehavior: req.body.familyBehavior ? String(req.body.familyBehavior).slice(0, 300) : '',
      comment: req.body.comment ? String(req.body.comment).slice(0, 500) : '',
      unsafeFlag,
      reportedAt: new Date(),
    };
    await request.save();

    let alert = null;
    if (unsafeFlag) {
      await User.findByIdAndUpdate(request.patientId, {
        $set: {
          'safety.unsafeFlag': true,
          'safety.unsafeReason': request.nursePatientReport.comment || 'Nurse reported unsafe patient/attendant behavior.',
          'safety.lastReportedAt': new Date(),
        },
        $inc: { 'safety.reportCount': 1 },
      });

      alert = await SafetyAlert.create({
        requestId: request._id,
        patientId: request.patientId,
        nurseId: req.user._id,
        type: 'unsafe_patient',
        severity: 'high',
        message: request.nursePatientReport.comment || 'Nurse reported unsafe patient/attendant behavior.',
      });

      const admins = await User.find({ role: 'admin' }).select('_id');
      if (admins.length) {
        await Notification.insertMany(admins.map(admin => ({
          userId: admin._id,
          message: 'Unsafe patient behavior reported by nurse. Review safety panel.',
          type: 'system',
          metadata: { requestId: request._id, safetyAlertId: alert._id },
        })));
      }
    }

    res.json({ success: true, request, alert });
  } catch (error) {
    console.error('[Request PatientBehavior]', error);
    res.status(500).json({ error: 'Failed to submit patient behavior report.' });
  }
};

module.exports = {
  createRequest,
  getPatientRequests,
  getNurseRequests,
  getOpenRequests,
  getRequestForNurseInterview,
  generateLongtermInterviewQuestions,
  submitLongtermInterview,
  updateRequestStatus,
  rateCompletedRequest,
  raiseSafetySOS,
  checkInVisit,
  checkOutVisit,
  reportPatientBehavior,
};
