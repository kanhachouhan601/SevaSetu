// src/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NurseProfile = require('../models/NurseProfile');
const Notification = require('../models/Notification');
const { callAI } = require('../services/aiProvider.service');

const NURSE_INTERVIEW_ASSESSOR_PROMPT = `You are a senior clinical nursing assessor for a production home-healthcare platform in India.

You are evaluating nurse candidates for real patient safety. Be strict, practical, and clinically grounded.

For single-answer assessment, return JSON only:
{
  "safe": true/false,
  "acknowledgement": "one short practical acknowledgement for the candidate",
  "concern": "short concern if answer is unsafe or incomplete, otherwise empty"
}

Flag unsafe answers for: ignoring emergency escalation, dangerous medication advice, poor infection control, no vitals/assessment in emergency scenarios, unethical conduct, or advice outside nursing scope.`;

const NURSE_INTERVIEW_QUESTION_PROMPT = `You are a senior nursing interviewer for a real home-healthcare platform in India.

Generate practical nurse interview questions based on the candidate's selected specializations and experience.

Requirements:
- Return JSON only: {"questions": ["question 1", "question 2", ...]}
- Generate exactly 6 questions.
- At least 3 questions must test basic clinical safety every nurse must know: emergency breathlessness escalation, infection control/wound dressing, diabetes or hypoglycemia safety, medication scope, vitals, patient communication.
- At least 2 questions must be tailored to the candidate's selected specializations.
- Questions must be realistic home-care scenarios, not theory definitions.
- Write in simple Hinglish/Hindi Roman script that Indian nurses can understand.
- Do not include answers or scoring hints.`;

const NURSE_INTERVIEW_FINAL_PROMPT = `You are the final AI clinical assessor for nurse onboarding on a real home-healthcare web application in India.

Evaluate the full interview transcript. The account must be approved only if the candidate shows safe, practical home-care nursing judgment.

Pass criteria:
- Recognizes emergencies and escalates to doctor/ambulance/hospital when needed
- Checks vitals and patient condition before action
- Uses infection-control practices for wound care
- Handles diabetes/hypoglycemia safely
- Stays within nursing scope and avoids unsafe drug/dosage claims
- Communicates professionally and protects patient safety
- Mark passed true only when score is 7 or higher out of 10.

Auto-fail for dangerous clinical advice, missing emergency escalation in breathlessness, unsafe medication/dosage decisions, poor infection control, or unethical behavior.

Return JSON only:
{
  "passed": true/false,
  "score": 0-10,
  "feedback": "2-4 sentence professional assessment",
  "criticalFailReason": "only if failed for unsafe clinical reason"
}`;

const parseExperienceYears = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const parseAiJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const json = text.match(/\{[\s\S]*\}/);
    if (!json) throw new Error('AI returned invalid evaluation format.');
    return JSON.parse(json[0]);
  }
};

const isAdminRegistrationAllowed = (providedSecret) => {
  if (process.env.NODE_ENV !== 'production') return true;
  return Boolean(process.env.ADMIN_REGISTRATION_SECRET && providedSecret === process.env.ADMIN_REGISTRATION_SECRET);
};

const evaluateNurseInterview = async ({ answers = [], questions = [], candidate = {} }) => {
  const transcript = answers.map((answer, index) => (
    `Question ${index + 1}: ${questions[index] || 'Clinical scenario'}\nAnswer ${index + 1}: ${answer}`
  )).join('\n\n');

  const raw = await callAI({
    systemInstruction: NURSE_INTERVIEW_FINAL_PROMPT,
    contents: [{
      role: 'user',
      parts: [{
        text: `Candidate profile:
Name: ${candidate.name || 'unknown'}
Specializations: ${(candidate.specializations || []).join(', ') || 'not provided'}
Experience: ${candidate.experience || 'not provided'}
City: ${candidate.city || 'not provided'}

Interview transcript:
${transcript}`,
      }],
    }],
    maxOutputTokens: 700,
    temperature: 0.2,
    responseMimeType: 'application/json',
  });

  const parsed = parseAiJson(raw);
  const score = Math.max(0, Math.min(10, parseFloat(parsed.score) || 0));
  return {
    passed: Boolean(parsed.passed) && score >= 7 && !parsed.criticalFailReason,
    score,
    feedback: parsed.feedback || 'AI clinical assessment completed.',
    criticalFailReason: parsed.criticalFailReason || '',
  };
};

const mapUploadedDocument = (file) => file ? {
  originalName: file.originalname,
  filename: file.filename,
  url: `/uploads/nurses/${file.filename}`,
  mimeType: file.mimetype,
  size: file.size,
} : undefined;

const generateNurseInterviewQuestions = async (req, res) => {
  try {
    const { specializations, experience, city } = req.body;

    if (!Array.isArray(specializations) || specializations.length === 0) {
      return res.status(400).json({ error: 'Select at least one specialization first.' });
    }

    const raw = await callAI({
      systemInstruction: NURSE_INTERVIEW_QUESTION_PROMPT,
      contents: [{
        role: 'user',
        parts: [{
          text: `Candidate specializations: ${specializations.join(', ')}
Experience: ${experience || 'not provided'}
City: ${city || 'not provided'}

Create the interview questions now.`,
        }],
      }],
      maxOutputTokens: 700,
      temperature: 0.35,
      responseMimeType: 'application/json',
    });

    const parsed = parseAiJson(raw);
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.map(q => String(q).trim()).filter(Boolean).slice(0, 6)
      : [];

    if (questions.length < 6) {
      return res.status(502).json({ error: 'AI could not generate enough interview questions. Please try again.' });
    }

    res.json({ success: true, questions });
  } catch (error) {
    console.error('[Nurse Interview Questions]', error);
    const status = error.status || (error.message.includes('not configured') ? 503 : 500);
    res.status(status).json({ error: error.message || 'AI question generation failed.' });
  }
};

const validateRegistrationStart = async (req, res) => {
  try {
    const { name, email, password, phone, role, specializations, experience, gender, adminSecret } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    if (!/^\S+@\S+\.\S+$/.test(String(email))) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const validRoles = ['patient', 'nurse', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'patient';

    if (userRole === 'admin' && !isAdminRegistrationAllowed(adminSecret)) {
      return res.status(403).json({ error: 'Admin registration is restricted.' });
    }

    if (userRole === 'nurse') {
      if (!Array.isArray(specializations) || specializations.length === 0) {
        return res.status(400).json({ error: 'Select at least one nurse specialization.' });
      }
      if (!experience) {
        return res.status(400).json({ error: 'Select nurse experience.' });
      }
      if (!gender) {
        return res.status(400).json({ error: 'Select nurse gender.' });
      }
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Auth ValidateRegistrationStart]', error);
    res.status(500).json({ error: 'Registration validation failed. Please try again.' });
  }
};

const assessNurseInterviewAnswer = async (req, res) => {
  try {
    const { question, answer, questionIndex, candidate } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required.' });
    }

    const raw = await callAI({
      systemInstruction: NURSE_INTERVIEW_ASSESSOR_PROMPT,
      contents: [{
        role: 'user',
        parts: [{
          text: `Candidate:
${JSON.stringify(candidate || {}, null, 2)}

Question ${Number(questionIndex) + 1}: ${question}
Candidate answer: ${answer}`,
        }],
      }],
      maxOutputTokens: 350,
      temperature: 0.2,
      responseMimeType: 'application/json',
    });

    const parsed = parseAiJson(raw);
    res.json({
      success: true,
      safe: Boolean(parsed.safe),
      acknowledgement: parsed.acknowledgement || 'Answer reviewed.',
      concern: parsed.concern || '',
    });
  } catch (error) {
    console.error('[Nurse Interview Assess]', error);
    const status = error.status || (error.message.includes('not configured') ? 503 : 500);
    res.status(status).json({ error: error.message || 'AI interview assessment failed.' });
  }
};

// ─── Generate JWT ─────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

// ─── POST /api/auth/register ──────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, address, city, experience, gender, interviewAnswers, interviewQuestions, adminSecret } = req.body;
    const specializations = Array.isArray(req.body.specializations)
      ? req.body.specializations
      : req.body.specializations ? [req.body.specializations] : [];

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const validRoles = ['patient', 'nurse', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'patient';

    if (userRole === 'admin' && !isAdminRegistrationAllowed(adminSecret)) {
      return res.status(403).json({ error: 'Admin registration is restricted.' });
    }

    let interviewResult = null;
    if (userRole === 'nurse') {
      if (!Array.isArray(interviewAnswers) || interviewAnswers.length < 3) {
        return res.status(400).json({ error: 'Please complete the nurse clinical interview first.' });
      }

      if (!req.files?.nursingCert?.[0] || !req.files?.idProof?.[0] || !req.files?.resume?.[0]) {
        return res.status(400).json({ error: 'Nursing certificate, ID proof and resume are required for nurse registration.' });
      }

      interviewResult = await evaluateNurseInterview({
        answers: Array.isArray(interviewAnswers) ? interviewAnswers : [interviewAnswers],
        questions: Array.isArray(interviewQuestions) ? interviewQuestions : [interviewQuestions],
        candidate: { name, city, specializations, experience },
      });
      if (!interviewResult.passed) {
        return res.status(400).json({
          error: `AI interview not cleared. Score: ${interviewResult.score}/10. Minimum 7/10 required. ${interviewResult.criticalFailReason || interviewResult.feedback}`,
        });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: userRole,
      address,
      city,
    });

    // Auto-create NurseProfile if registering as nurse
    if (userRole === 'nurse') {
      const nursingCert = mapUploadedDocument(req.files?.nursingCert?.[0]);
      const idProof = mapUploadedDocument(req.files?.idProof?.[0]);
      const resume = mapUploadedDocument(req.files?.resume?.[0]);

      await NurseProfile.create({
        userId: user._id,
        specializations: Array.isArray(specializations) ? specializations : [],
        experience: parseExperienceYears(experience),
        gender: ['female', 'male', 'other', 'prefer_not_to_say'].includes(gender) ? gender : null,
        location: { city },
        status: 'pending',
        availability: true,
        documents: {
          nursingCert: Boolean(nursingCert),
          idProof: Boolean(idProof),
          cvUploaded: Boolean(resume),
        },
        documentFiles: {
          nursingCert,
          idProof,
          resume,
        },
        interviewScore: interviewResult.score,
        interviewFeedback: interviewResult.feedback,
      });
    }

    // Welcome notification
    await Notification.create({
      userId: user._id,
      message: userRole === 'nurse'
        ? `Welcome to NurseConnect, ${name}! Your AI interview is cleared. Admin will review your documents before patient requests are enabled.`
        : `Welcome to NurseConnect, ${name}! Your account has been created successfully.`,
      type: 'system',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        city: user.city,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Auth Register]', error);
    if (error.status === 429 || error.message.includes('AI quota exhausted')) {
      return res.status(429).json({ error: error.message });
    }
    if (error.message.includes('not configured')) {
      return res.status(503).json({ error: error.message });
    }
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already exists.' });
    }
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account deactivated. Please contact support.' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        city: user.city,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Auth Login]', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = req.user;

    let nurseProfile = null;
    if (user.role === 'nurse') {
      nurseProfile = await NurseProfile.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        city: user.city,
        createdAt: user.createdAt,
      },
      nurseProfile: nurseProfile || undefined,
    });
  } catch (error) {
    console.error('[Auth GetMe]', error);
    res.status(500).json({ error: 'Failed to fetch user info.' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  assessNurseInterviewAnswer,
  generateNurseInterviewQuestions,
  validateRegistrationStart,
};
