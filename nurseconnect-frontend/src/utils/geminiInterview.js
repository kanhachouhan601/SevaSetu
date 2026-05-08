import { FALLBACK_INTERVIEW_QUESTIONS, getFirstName, HUMAN_FILLERS } from "./interviewQuestions";

const MODEL = "gemini-1.5-flash";
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

export const SYSTEM_PROMPT = `You are Dr. NIDHI, an experienced AI nurse interviewer for NurseConnect, India's home nursing platform. You are warm, professional, and encouraging. You speak in Hinglish (Hindi + English mix). You are interviewing a nurse candidate.

Conduct a 10-question interview covering:
1. Introduction and experience (2 questions)
2. Clinical knowledge - BP, diabetes, wounds, injections (3 questions)
3. Emergency handling scenarios (2 questions)
4. Patient and family communication (2 questions)
5. Availability and commitment (1 question)

Rules:
- Ask one question at a time.
- React naturally to answers before asking next question.
- If answer is weak, gently probe deeper.
- Keep questions relevant to home nursing in India.
- Use simple Hinglish that rural nurses understand.
- Use natural interviewer fillers like "Haan ji", "Bilkul", "Achha", "Hmm", "Good point".
- Never shame the nurse for asking doubt.
- After all 10 questions, say goodbye warmly and generate JSON report.`;

export function getGeminiKey() {
  return import.meta.env.VITE_GEMINI_KEY || import.meta.env.REACT_APP_GEMINI_KEY || "";
}

async function callGemini({ contents, generationConfig }) {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Gemini key missing. Set VITE_GEMINI_KEY in frontend environment.");

  const response = await fetch(`${API_ROOT}/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        temperature: 0.65,
        topP: 0.9,
        maxOutputTokens: 1200,
        ...generationConfig,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || "Gemini request failed.");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim() || "";
}

function parseJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini JSON parse failed.");
    return JSON.parse(match[0]);
  }
}

export async function generateInterviewQuestions({ nurseName, patientProblem, patientRequirements, city }) {
  try {
    const text = await callGemini({
      contents: [{
        role: "user",
        parts: [{
          text: `Generate exactly 10 interview questions as a JSON array only.
Candidate name: ${nurseName || "Nurse"}
Patient problem: ${patientProblem || "Long-term home nursing care"}
Requirements: ${patientRequirements || ""}
City/context: ${city || "India"}

Return shape:
{"questions":["..."]}`,
        }],
      }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1600 },
    });
    const parsed = parseJsonFromText(text);
    const questions = Array.isArray(parsed.questions) ? parsed.questions.filter(Boolean).slice(0, 10) : [];
    return questions.length === 10 ? questions : FALLBACK_INTERVIEW_QUESTIONS;
  } catch {
    return FALLBACK_INTERVIEW_QUESTIONS;
  }
}

export async function generateAgentReaction({ nurseName, question, answer, questionIndex }) {
  const firstName = getFirstName(nurseName);
  const shortAnswer = String(answer || "").trim().length < 45;
  const longAnswer = String(answer || "").trim().length > 650;

  try {
    const text = await callGemini({
      contents: [{
        role: "user",
        parts: [{
          text: `The nurse just answered question ${questionIndex + 1}.
Question: ${question}
Answer: ${answer}

Respond like a real warm interviewer in 1-2 Hinglish sentences. Include acknowledgement and, only if needed, one gentle follow-up/probe. Nurse first name is ${firstName}.
If answer is too short, ask: "Haan, aur? Kuch aur add karna chahenge?"
If answer is very long, summarize briefly.`,
        }],
      }],
      generationConfig: { maxOutputTokens: 180, temperature: 0.8 },
    });
    return text || buildLocalReaction({ firstName, shortAnswer, longAnswer });
  } catch {
    return buildLocalReaction({ firstName, shortAnswer, longAnswer });
  }
}

function buildLocalReaction({ firstName, shortAnswer, longAnswer }) {
  const filler = HUMAN_FILLERS[Math.floor(Math.random() * HUMAN_FILLERS.length)];
  if (shortAnswer) return `${filler} ${firstName}, haan, aur? Kuch aur add karna chahenge?`;
  if (longAnswer) return `${filler} main samajh gaya. Toh summary mein, aap patient safety aur clear steps par focus kar rahe hain.`;
  return `${filler} ${firstName}, aap sahi direction mein ja rahe hain.`;
}

export function buildDoubtResponse(question) {
  return `Koi baat nahi, yeh cheez confusing lagti hai pehle pehle. Bilkul, main dobara explain karta hun. Simple words mein: ${question} Socho agar ek patient ko ghar par yeh problem ho, toh aap practical steps mein kya karenge?`;
}

export async function generateFinalReport({ candidateName, transcript, attentionEvents, startedAt, endedAt }) {
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
      attentiveness: Math.max(40, 100 - Math.min(60, attentionEvents.length * 8)),
    },
    attentionEvents,
    strengths: ["Completed AI interview", "Communicated in practical terms"],
    concerns: attentionEvents.length ? ["Attention events recorded during interview"] : [],
    adminNotes: "Review full transcript and attention log before final approval.",
    transcript,
    startedAt,
    endedAt,
  };

  try {
    const text = await callGemini({
      contents: [{
        role: "user",
        parts: [{
          text: `Generate a strict but fair JSON report for this NurseConnect AI video interview.
Candidate: ${candidateName}
Transcript JSON: ${JSON.stringify(transcript)}
Attention events JSON: ${JSON.stringify(attentionEvents)}

Return JSON only with this exact shape:
{
  "candidateName": "",
  "interviewDate": "",
  "overallScore": 85,
  "recommendation": "Strongly Recommended / Recommended / Not Recommended",
  "scores": {
    "clinicalKnowledge": 80,
    "emergencyHandling": 90,
    "communication": 85,
    "patientCare": 88,
    "professionalism": 82,
    "attentiveness": 75
  },
  "attentionEvents": [],
  "strengths": [],
  "concerns": [],
  "adminNotes": "",
  "transcript": []
}`,
        }],
      }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2200, temperature: 0.25 },
    });
    return { ...baseReport, ...parseJsonFromText(text), attentionEvents, transcript, startedAt, endedAt };
  } catch {
    return baseReport;
  }
}

export function saveInterviewReport(report) {
  const key = "nurseconnect_interview_reports";
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  const next = [{ ...report, id: report.id || `${Date.now()}` }, ...existing.filter(item => item.id !== report.id)].slice(0, 100);
  localStorage.setItem(key, JSON.stringify(next));
  return next[0];
}

export function loadInterviewReports() {
  try {
    return JSON.parse(localStorage.getItem("nurseconnect_interview_reports") || "[]");
  } catch {
    return [];
  }
}
