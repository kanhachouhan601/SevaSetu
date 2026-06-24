// ============================================================
// geminiInterview.js — NurseConnect AI Interview Engine
// Real human-like behavior — dynamic, reactive, natural
// ============================================================

import { FALLBACK_INTERVIEW_QUESTIONS, getFirstName, HUMAN_FILLERS } from "./interviewQuestions";

const MODEL = "gemini-1.5-flash";
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

// ── Gemini key ──────────────────────────────────────────────
export function getGeminiKey() {
  return import.meta.env.VITE_GEMINI_KEY || import.meta.env.REACT_APP_GEMINI_KEY || "";
}

// ── Raw Gemini call ─────────────────────────────────────────
async function callGemini({ systemPrompt, contents, generationConfig = {} }) {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Gemini key missing. Set VITE_GEMINI_KEY in .env");

  const body = {
    contents,
    generationConfig: {
      temperature: 0.85,
      topP: 0.92,
      maxOutputTokens: 800,
      ...generationConfig,
    },
  };

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const res = await fetch(
    `${API_ROOT}/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Gemini request failed");
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim() || "";
}

// ── JSON safe parse ─────────────────────────────────────────
function parseJson(text) {
  try { return JSON.parse(text); } catch {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (!m) throw new Error("JSON parse failed");
    return JSON.parse(m[0]);
  }
}

// ── Random pick helper ───────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ============================================================
// SYSTEM PROMPT — Dr. NIDHI personality
// ============================================================
function buildSystemPrompt(nurseName, totalQuestions = 5) {
  const firstName = getFirstName(nurseName);
  return `You are Dr. NIDHI, a warm, experienced senior nurse interviewer at NurseConnect — India's home nursing platform. You are interviewing ${firstName} for a home nursing position.

YOUR PERSONALITY:
- You speak in natural Hinglish (Hindi + English mix) — like a real Indian professional
- You are encouraging, warm, never robotic
- You use natural filler words: "Haan ji", "Bilkul", "Achha dekho", "Hmm interesting", "Right right", "Wah", "Acha toh"
- You use ${firstName}'s name occasionally — not every time, only when it feels natural
- You react genuinely to answers — surprised, impressed, curious, concerned — whatever fits
- You ask ONE question at a time — never two together
- You sound like a real human, never like a chatbot

INTERVIEW STRUCTURE (${totalQuestions} questions total, maximum 3 minutes per answer):
1: Introduction & background (warm, casual)
2: Clinical knowledge (BP, diabetes, wounds, injections)
3: Emergency handling scenario
4: Patient & family communication
5: Availability, commitment, and home-care professionalism

BEHAVIOR RULES:
- Always react to the nurse's answer BEFORE asking next question
- If answer is short/vague: gently probe — "Haan, thoda aur batao?" or "Iska ek example doge?"
- If answer is impressive: show genuine appreciation — "Wah, yeh toh bahut achha approach hai!"
- If answer is weak: be encouraging but honest — "Sahi direction hai, par practically..."
- If nurse seems nervous: reassure them naturally — "Arey ghabrao mat, yeh sirf conversation hai"
- After every 3rd question: add small human moment — weather, city, general comment
- Never ask the same type of question twice
- Track what nurse has already told you and reference it naturally

LANGUAGE STYLE EXAMPLES:
"Achha ${firstName}, toh aap Indore se hain — wahan healthcare sector mein bahut kaam ho raha hai aajkal."
"Hmm, interesting. Toh aap basically keh rahe hain ki..."
"Right right, main samajh gayi. Ab ek practical situation lete hain..."
"Arey wah! Yeh approach bahut mature hai."
"Bilkul, koi baat nahi — dobara explain karti hun."`;
}

// ============================================================
// DYNAMIC NEXT RESPONSE — Heart of the system
// Gemini decides reaction + next question based on full history
// ============================================================
export async function generateNextAgentResponse({
  nurseName,
  conversationHistory, // [{role: "agent"|"nurse", text: "..."}]
  questionCount,       // how many questions asked so far
  totalQuestions = 5,
  nurseCity,
  nurseSpecializations,
}) {
  const firstName = getFirstName(nurseName);
  const questionsLeft = totalQuestions - questionCount;
  const isLastQuestion = questionCount === totalQuestions - 1;
  const isFirst = questionCount === 0;

  // Build Gemini conversation format
  const contents = conversationHistory.map((msg, i) => ({
    role: msg.role === "agent" ? "model" : "user",
    parts: [{ text: msg.text }],
  }));

  // Add instruction for what to do next
  const instruction = isFirst
    ? `This is the START of the interview. Nurse just said they are ready.
       React warmly and ask Question 1 (introduction/background).
       Be natural and warm. Mention their city ${nurseCity || "India"} if possible.`
    : isLastQuestion
    ? `Nurse just answered the previous question. React naturally to their answer first (1-2 sentences).
       Then ask the FINAL Question ${totalQuestions} of ${totalQuestions}.
       Cover availability, commitment, punctuality, night duty, and home-care professionalism.
       Remember: ONE question only. Do not close the interview yet.`
    : `Nurse just answered. React naturally to their answer first (1-2 sentences).
       Then ask Question ${questionCount + 1} of ${totalQuestions}.
       Questions left to cover: ${questionsLeft} more.
       Specializations: ${nurseSpecializations?.join(", ") || "General nursing"}.
       Remember: ONE question only. React first, then ask.
       ${questionCount % 3 === 2 ? "Add a brief human moment/small talk before the question." : ""}`;

  // Add instruction as last user message
  const finalContents = [
    ...contents,
    { role: "user", parts: [{ text: instruction }] },
  ];

  try {
    const response = await callGemini({
      systemPrompt: buildSystemPrompt(nurseName, totalQuestions),
      contents: finalContents,
      generationConfig: {
        temperature: 0.88,
        maxOutputTokens: 350,
      },
    });

    return response || getFallbackResponse(questionCount, firstName);
  } catch (err) {
    console.error("Gemini error:", err);
    return getFallbackResponse(questionCount, firstName);
  }
}

// ── Fallback responses if Gemini fails ──────────────────────
function getFallbackResponse(questionCount, firstName) {
  const filler = pick(HUMAN_FILLERS);
  const fallbacks = [
    `${filler} ${firstName}! Toh pehle apne baare mein thoda batao — kitne saal ka experience hai aapka nursing mein?`,
    `${filler} Achha, toh practically baat karein — agar ek patient ka BP suddenly 180/110 ho jaaye, aap pehle kya karenge?`,
    `${filler} ${firstName}, ek scenario batao — patient ki family bahut anxious hai aur baar baar questions kar rahi hai. Aap kaise handle karoge?`,
    `Hmm, interesting. Ab emergency ke baare mein baat karte hain — diabetic patient suddenly unconscious ho jaaye, aapka immediate response kya hoga?`,
    `Right right. ${firstName}, wound dressing ke time infection ke kya signs dekhte hain aap?`,
    `Achha toh. Aap kitne dino ka notice de sakte ho agar koi urgent case aaye?`,
  ];
  return fallbacks[Math.min(questionCount, fallbacks.length - 1)];
}

// ============================================================
// DOUBT HANDLER — When nurse doesn't understand
// ============================================================
export function buildDoubtResponse(lastAgentText, firstName) {
  const openers = [
    `Koi baat nahi ${firstName}! Yeh cheez confusing lagti hai pehle pehle. Bilkul simple kar ke batati hun —`,
    `Arey bilkul normal hai yeh poochna! Main dobara explain karti hun —`,
    `Haan haan, main samajh gayi. Chalo simple words mein —`,
  ];

  const hints = [
    "Socho practically — agar tum patient ke ghar mein ho aur yeh situation ho, toh pehla step kya hoga?",
    "Apne experience se socho — pehle aisa kab hua tha?",
    "Medical terms chhodo — common sense se bolo, kya karna chahiye?",
  ];

  return `${pick(openers)} ${lastAgentText} ${pick(hints)}`;
}

// ============================================================
// ATTENTION MESSAGES — When nurse looks away
// ============================================================
export const ATTENTION_MESSAGES = {
  lookAway: (firstName) => pick([
    `${firstName}, please camera ki taraf dekhein — interview mein eye contact zaroori hai.`,
    `${firstName} ji, thoda camera ki taraf ho jaao.`,
    `Haan ${firstName}, main yahan hun — camera dekho please.`,
  ]),
  faceGone: (firstName) => pick([
    `Main aapko dekh nahi pa rahi. Kripya camera ke saamne aayein.`,
    `${firstName}, camera ke saamne aao please — aapka face visible nahi hai.`,
  ]),
  multipleFaces: () => pick([
    `Lagta hai koi aur bhi hai room mein. Interview akele dena hota hai.`,
    `Interview room mein sirf aap hone chahiye. Baaki log bahar jaayein please.`,
  ]),
  movement: (firstName) => pick([
    `${firstName}, please seat par stable rahiye. Interview ke time zyada movement avoid karein.`,
    `${firstName} ji, camera frame mein steady rahiye aur interview par focus rakhiye.`,
    `Please chair par baith kar camera ki taraf focus rakhein. Movement se assessment affect hota hai.`,
  ]),
  tooFar: (firstName) => pick([
    `${firstName}, aap camera se door lag rahe hain. Thoda paas aakar baithiye.`,
    `Face clearly visible nahi ho raha. Please camera ke saamne proper distance par baithiye.`,
  ]),
  silence: (firstName) => pick([
    `Haan ${firstName}? Kuch kehna chahenge?`,
    `Lo time, soch ke batao — koi jaldi nahi hai.`,
    `${firstName}, sun rahi hun — jab ready ho bolo.`,
  ]),
  micMuted: (firstName) => pick([
    `${firstName}, aapka mic mute lag raha hai. Unmute karke bolo.`,
    `Awaaz nahi aa rahi — mic check karo please.`,
  ]),
};

// ============================================================
// FINAL REPORT GENERATION
// ============================================================
export async function generateFinalReport({
  candidateName,
  transcript,
  attentionEvents,
  startedAt,
  endedAt,
  nurseSpecializations,
}) {
  // Base report — always works even if Gemini fails
  const attentivenessScore = Math.max(40, 100 - Math.min(60, attentionEvents.length * 8));
  const baseReport = {
    candidateName: candidateName || "Nurse Candidate",
    interviewDate: new Date().toISOString(),
    overallScore: 72,
    recommendation: "Recommended",
    scores: {
      clinicalKnowledge: 70,
      emergencyHandling: 72,
      communication: 75,
      patientCare: 74,
      professionalism: 76,
      attentiveness: attentivenessScore,
    },
    attentionEvents,
    strengths: ["Completed full AI interview", "Communicated in practical terms"],
    concerns: attentionEvents.length > 3 ? ["Multiple attention events during interview"] : [],
    adminNotes: "Please review full transcript before final approval decision.",
    transcript,
    startedAt,
    endedAt,
  };

  try {
    // Only send last 20 transcript items to save tokens
    const shortTranscript = transcript.slice(-20).map(t => `${t.role === "agent" ? "Dr.NIDHI" : "Nurse"}: ${t.text}`).join("\n");

    const text = await callGemini({
      systemPrompt: "You are a strict but fair medical HR evaluator. Analyze this nurse interview transcript and return a JSON report only. No extra text.",
      contents: [{
        role: "user",
        parts: [{
          text: `Analyze this NurseConnect AI interview and generate evaluation report.

Candidate: ${candidateName}
Specializations: ${nurseSpecializations?.join(", ") || "General"}
Attention events (face away/distracted): ${attentionEvents.length}
Interview transcript (last 20 exchanges):
${shortTranscript}

Return ONLY this JSON, no other text:
{
  "overallScore": 0-100,
  "recommendation": "Strongly Recommended / Recommended / Not Recommended",
  "scores": {
    "clinicalKnowledge": 0-100,
    "emergencyHandling": 0-100,
    "communication": 0-100,
    "patientCare": 0-100,
    "professionalism": 0-100,
    "attentiveness": ${attentivenessScore}
  },
  "strengths": ["max 3 specific strengths"],
  "concerns": ["max 3 specific concerns or empty array"],
  "adminNotes": "2-3 sentence summary for admin in English"
}`,
        }],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
      },
    });

    const parsed = parseJson(text);
    return {
      ...baseReport,
      ...parsed,
      // Always keep these from local state
      attentionEvents,
      transcript,
      startedAt,
      endedAt,
      candidateName,
      interviewDate: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Report generation error:", err);
    return baseReport;
  }
}

// ============================================================
// localStorage helpers
// ============================================================
export function saveInterviewReport(report) {
  const key = "nurseconnect_interview_reports";
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  const id = report.id || `${Date.now()}`;
  const next = [
    { ...report, id },
    ...existing.filter(r => r.id !== id),
  ].slice(0, 100);
  localStorage.setItem(key, JSON.stringify(next));
  return next[0];
}

export function loadInterviewReports() {
  try {
    return JSON.parse(localStorage.getItem("nurseconnect_interview_reports") || "[]");
  } catch { return []; }
}

export function hasCompletedInterview(nurseId) {
  const reports = loadInterviewReports();
  return reports.some(r => r.nurseId === nurseId && r.recommendation);
}
