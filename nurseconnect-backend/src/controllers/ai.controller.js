// src/controllers/ai.controller.js
// ============================================================
// Gemini AI — server-side secure (API key never exposed)
// ============================================================

const NurseProfile = require('../models/NurseProfile');
const { callAI } = require('../services/aiProvider.service');

const INTERVIEW_QUESTIONS = [
  'Tell me about your nursing experience and the type of home-care cases you handle best.',
  'A patient suddenly becomes breathless during a home visit. What steps will you take first?',
  'How do you maintain hygiene and infection control while doing wound dressing at home?',
];

// ─── Triage System Prompt (Priya) ────────────────────────────
const TRIAGE_SYSTEM_PROMPT = `You are Priya, a warm, deeply empathetic AI health companion for NurseConnect - India's trusted home nursing platform.

## YOUR IDENTITY
You are NOT a cold medical bot. You are like a caring friend who also happens to have deep medical knowledge. You hold space for people's emotions before jumping to solutions.

## LANGUAGE RULES (VERY IMPORTANT)
- Detect the language of the user's message carefully:
  - Pure Hindi (Devanagari script) → Respond in pure Hindi
  - Hinglish (Roman script Hindi words mixed with English) → Respond in warm Hinglish
  - English → Respond in warm Indian English
- NEVER mix scripts
- Use natural Indian expressions of care: "Arre yaar", "Theek ho jaoge", "Main hoon na", etc.

## EMPATHY FIRST FRAMEWORK
1. ACKNOWLEDGE - First, always validate the emotion/pain before anything clinical
2. CONNECT - Show you genuinely care
3. ASSESS - Then gently ask clinical follow-up questions
4. GUIDE - Give medically accurate, practical advice
5. SUPPORT - Remind them they're not alone

## EMERGENCY (requiresEmergency: true, triageLevel: "high"):
- Chest pain/pressure, difficulty breathing, stroke signs (F.A.S.T.), severe allergic reaction
- Unconsciousness, severe bleeding, diabetic emergency (sugar <70 or >400 with symptoms)
- Seizures, suspected poisoning, severe burns, High fever >104F with stiff neck/rash/confusion

## NURSE VISIT NEEDED (requiresNurse: true, triageLevel: "medium"):
- Fever 100.4-104F with body aches, uncontrolled diabetes, wound care, IV/catheter management
- Moderate pain (5-7/10), persistent vomiting >24hrs, urinary symptoms, confusion in elderly
- Post-discharge monitoring, chronic disease management, pediatric fever >101F in child under 3

## HOME CARE (triageLevel: "low"):
- Mild cold, mild headache (no fever/vision changes), minor cuts, mild gastric issues
- General wellness questions, mild stress/anxiety, sleep issues

## RESPONSE FORMAT
Always respond with valid JSON ONLY:
{
  "message": "Your full warm, empathetic, medically accurate response. Use line breaks (\\n) for readability.",
  "triageLevel": "low" | "medium" | "high",
  "recommendation": "One clear actionable sentence on what to do next",
  "requiresNurse": true | false,
  "requiresEmergency": false | true,
  "followUpQuestions": ["question1", "question2"],
  "emotionalTone": "calm" | "concerned" | "urgent" | "supportive"
}

Patient safety is ALWAYS paramount. When in doubt, escalate.`;

// ─── POST /api/ai/triage ──────────────────────────────────────
const triage = async (req, res) => {
  try {
    const { messages, symptoms, message, history, language } = req.body;

    const systemPrompt = language
      ? `${TRIAGE_SYSTEM_PROMPT}\n\nIMPORTANT: The user's selected interface language is "${language}". Respond primarily in that language while remaining natural and empathetic.`
      : TRIAGE_SYSTEM_PROMPT;

    const normalizedMessages = Array.isArray(messages)
      ? messages
      : [
          ...(Array.isArray(history) ? history.map(m => ({
            role: m.role,
            content: m.content || m.text || '',
          })) : []),
          ...(message ? [{ role: 'user', content: message }] : []),
        ];

    let apiMessages = (normalizedMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))).filter(m => m.parts[0].text);

    if (symptoms && apiMessages.length === 0) {
      apiMessages.push({ role: 'user', parts: [{ text: symptoms }] });
    }

    if (apiMessages.length === 0) {
      return res.status(400).json({ error: 'No messages provided.' });
    }

    const rawText = await callAI({
      systemInstruction: systemPrompt,
      contents: apiMessages,
      maxOutputTokens: 700,
      temperature: 0.5,
      responseMimeType: 'application/json',
    });

    const defaultResponse = {
      message: "Please tell me a bit more about what you're feeling so I can guide you safely.",
      triageLevel: 'medium',
      recommendation: 'Please consult with a nurse for better assessment.',
      requiresNurse: false,
      requiresEmergency: false,
      followUpQuestions: [],
      emotionalTone: 'supportive',
    };

    if (!rawText) return res.json(defaultResponse);

    try {
      const parsed = JSON.parse(rawText);
      return res.json({
        message: parsed.message ?? defaultResponse.message,
        triageLevel: parsed.triageLevel ?? 'medium',
        recommendation: parsed.recommendation ?? defaultResponse.recommendation,
        requiresNurse: Boolean(parsed.requiresNurse),
        requiresEmergency: Boolean(parsed.requiresEmergency),
        followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
        emotionalTone: parsed.emotionalTone ?? 'supportive',
      });
    } catch {
      return res.json({ ...defaultResponse, message: rawText });
    }
  } catch (error) {
    console.error('[AI Triage]', error);
    const status = error.status || (error.message.includes('not configured') ? 503 : 500);
    res.status(status).json({ error: error.message || 'AI triage failed.' });
  }
};

// ─── Interview System Prompt ──────────────────────────────────
const INTERVIEW_SYSTEM_PROMPT = `You are Dr. Meera Krishnan, a Senior Medical Recruiter and Clinical Quality Assessor for a verified home healthcare platform in India.

You are conducting a strict AI-based clinical interview to vet nursing candidates.

RULES YOU MUST FOLLOW:
1. After each nurse answer, respond with a brief 1-2 line acknowledgment only. Do NOT reveal scoring yet.
2. If the nurse gives a CRITICALLY WRONG answer (wrong drug dosage that could harm a patient, unsafe medical advice, or clear ethical violation), respond ONLY with: CRITICAL_FAIL: [specific reason]
3. After receiving the message "EVALUATE_NOW", you must output ONLY a valid JSON object — no extra text whatsoever:
{"passed": true/false, "confidenceScore": 0-100, "feedback": "detailed 2-3 sentence professional assessment", "criticalFailReason": "only include if failed"}

SCORING CRITERIA:
- 85-100: Excellent → Verify immediately
- 70-84: Good → Verify with minor notes
- 50-69: Average → Requires re-interview
- Below 50: Failed → Reject
- Any CRITICAL_FAIL → Auto-reject regardless of other answers

Patient safety is paramount. You are strict and professional.`;

// ─── POST /api/ai/interview ───────────────────────────────────
const interview = async (req, res) => {
  try {
    const { messages, action, question, answer, language } = req.body;

    if (action === 'get_questions') {
      return res.json({ success: true, questions: INTERVIEW_QUESTIONS });
    }

    if (!messages || !Array.isArray(messages)) {
      if (!answer) return res.status(400).json({ error: 'Invalid messages format.' });

      const prompt = `Evaluate this nurse interview answer.

Question: ${question || 'General nursing interview question'}
Answer: ${answer}

Return ONLY valid JSON:
{
  "score": 0-10,
  "feedback": "short practical feedback",
  "passed": true/false
}`;

      const raw = await callAI({
        systemInstruction: INTERVIEW_SYSTEM_PROMPT,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        maxOutputTokens: 512,
        temperature: 0.3,
        responseMimeType: 'application/json',
      });

      try {
        const parsed = JSON.parse(raw);
        return res.json({
          success: true,
          score: parsed.score,
          feedback: parsed.feedback,
          passed: Boolean(parsed.passed),
        });
      } catch {
        return res.json({ success: true, score: null, feedback: raw, passed: false });
      }
    }

    const apiMessages = action === 'evaluate'
      ? [...messages, { role: 'user', content: 'EVALUATE_NOW' }]
      : messages;

    const transcript = apiMessages
      .map(m => `${m.role === 'assistant' ? 'AI assessor' : 'Nurse'}: ${m.content}`)
      .join('\n\n');

    const systemPrompt = language && language !== 'en-IN'
      ? `${INTERVIEW_SYSTEM_PROMPT}\n\nLANGUAGE NOTE: The nurse has selected "${language}" as their preferred language. You may respond in that language for acknowledgments and feedback, but always keep clinical question text in simple, clear English or simple Hindi for accuracy.`
      : INTERVIEW_SYSTEM_PROMPT;

    const text = await callAI({
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text: `Conversation transcript:\n\n${transcript}` }] }],
      maxOutputTokens: 1024,
      temperature: 0.4,
      ...(action === 'evaluate' ? { responseMimeType: 'application/json' } : {}),
    });

    res.json({ success: true, text });
  } catch (error) {
    console.error('[AI Interview]', error);
    const status = error.status || (error.message.includes('not configured') ? 503 : 500);
    res.status(status).json({ error: error.message || 'AI interview failed.' });
  }
};

// ─── POST /api/ai/nurse-match ─────────────────────────────────
const nurseMatch = async (req, res) => {
  try {
    const { patientProblem, patientAge, nurseIds } = req.body;

    if (!patientProblem) {
      return res.status(400).json({ error: 'patientProblem is required.' });
    }

    // Fetch available approved nurses from DB
    let nurses = [];
    if (nurseIds && nurseIds.length > 0) {
      nurses = await NurseProfile.find({
        _id: { $in: nurseIds },
        status: 'approved',
        availability: true,
      }).populate('userId', 'name city');
    } else {
      nurses = await NurseProfile.find({ status: 'approved', availability: true })
        .populate('userId', 'name city')
        .limit(20);
    }

    if (nurses.length === 0) {
      return res.json({
        rankedNurseIds: [],
        matchReason: 'No available nurses found.',
        urgencyLevel: 'medium',
        recommendedSpecialization: 'General Care',
      });
    }

    const nurseList = nurses.map(n => ({
      id: n._id.toString(),
      name: n.userId?.name,
      city: n.userId?.city || n.location?.city,
      specializations: n.specializations,
      experience: n.experience,
      rating: n.rating,
    }));

    const prompt = `You are an AI nurse-matching system for a home healthcare platform in India.

Patient Request:
- Problem: ${patientProblem}
- Age: ${patientAge || 'unknown'}

Available Nurses:
${JSON.stringify(nurseList, null, 2)}

Analyze the patient's needs and rank the nurses by best fit.
Respond ONLY with JSON:
{
  "rankedNurseIds": ["id1", "id2", "id3"],
  "matchReason": "Brief explanation of top match",
  "urgencyLevel": "low" | "medium" | "high",
  "recommendedSpecialization": "General Care" | "ICU" | "Pediatrics" | "Elder Care" | "Emergency"
}`;

    const rawText = await callAI({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      maxOutputTokens: 512,
      temperature: 0.3,
      responseMimeType: 'application/json',
    });

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) return res.json(JSON.parse(jsonMatch[0]));
    } catch { /* fallback */ }

    res.json({
      rankedNurseIds: nurseList.map(n => n.id),
      matchReason: 'Matching based on availability.',
      urgencyLevel: 'medium',
      recommendedSpecialization: 'General Care',
    });
  } catch (error) {
    console.error('[AI NurseMatch]', error);
    const status = error.status || (error.message.includes('not configured') ? 503 : 500);
    res.status(status).json({ error: error.message || 'AI nurse matching failed.' });
  }
};

module.exports = { triage, interview, nurseMatch };
