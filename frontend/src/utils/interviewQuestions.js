export const FALLBACK_INTERVIEW_QUESTIONS = [
  "Haan ji, sabse pehle apne nursing experience ke baare mein batayein. Aapne home care ya hospital mein kis tarah ke patients handle kiye hain?",
  "Aap home nursing mein kaam kyun karna chahte hain, aur patient ke ghar par professional boundaries kaise maintain karenge?",
  "Agar patient ka BP 180/110 aa raha hai aur patient ko headache hai, toh aap step by step kya karenge?",
  "Diabetes patient ko insulin dene se pehle aap kaun kaun si safety checks karenge?",
  "Wound dressing karte waqt infection control ke liye aap kaunsi precautions follow karte hain?",
  "Agar patient ko injection ke baad allergic reaction ya breathing difficulty ho jaaye, toh aap immediate kya action lenge?",
  "Agar elderly patient gir jaata hai aur hip pain batata hai, toh aap family ko kya guide karenge aur patient ko kaise handle karenge?",
  "Kabhi family member angry ya anxious ho jaaye, toh aap calm communication kaise maintain karenge?",
  "Aap patient ko medicine, diet, hygiene ya exercise follow karne ke liye kaise motivate karte hain?",
  "Long-term home care mein night duty, punctuality aur emergency availability ke liye aapki commitment kya hai?",
];

export const DOUBT_KEYWORDS = [
  "samjha nahi",
  "samajh nahi",
  "kya matlab",
  "please repeat",
  "repeat",
  "dobara",
  "what do you mean",
  "clarify",
  "i don't understand",
  "question samajh nahi",
];

export const READY_KEYWORDS = ["yes", "ready", "haan", "han", "ji", "taiyaar", "start", "shuru"];

export const HUMAN_FILLERS = [
  "Haan ji...",
  "Bilkul...",
  "Achha...",
  "I see...",
  "Theek hai...",
  "Hmm...",
  "Interesting...",
  "Acha toh...",
  "Bahut achha.",
  "Samajh gaya.",
  "Right, right...",
  "Good point.",
  "Yeh ek bahut important point hai.",
];

export function includesAny(text = "", keywords = []) {
  const lower = String(text).toLowerCase();
  return keywords.some(keyword => lower.includes(keyword));
}

export function getFirstName(name = "Priya") {
  return String(name || "Priya").trim().split(/\s+/)[0] || "Priya";
}
