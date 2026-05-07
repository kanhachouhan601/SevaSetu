import { useState, useEffect, useRef } from "react";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";

// ── Icons (inline SVG helpers) ───────────────────────────────
const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);
const BotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4M8 15h.01M16 15h.01"/>
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
);
const BellIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/>
  </svg>
);
const MicIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8"/>
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.5 1.22 2 2 0 012.5.04h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.04-1.04a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);
const PaperclipIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
  </svg>
);
const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const StarIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" className={`w-5 h-5 ${filled ? "text-amber-400 fill-current" : "text-gray-300 fill-none"}`} stroke="currentColor" strokeWidth="2">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
  </svg>
);

// ── Status badge ─────────────────────────────────────────────
const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  matched: "bg-blue-100 text-blue-700 border border-blue-200",
  "interview-scheduled": "bg-purple-100 text-purple-700 border border-purple-200",
  "in-progress": "bg-green-100 text-green-700 border border-green-200",
  completed: "bg-gray-100 text-gray-600 border border-gray-200",
  cancelled: "bg-red-100 text-red-600 border border-red-200",
};
const STATUS_LABELS = {
  pending: "⏳ Pending",
  matched: "🔗 Matched",
  "interview-scheduled": "🎥 Interview Scheduled",
  "in-progress": "🚀 In Progress",
  completed: "✅ Completed",
  cancelled: "❌ Cancelled",
};

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLES[status] || "bg-gray-100 text-gray-600 border border-gray-200"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function getPatientNextStep(req) {
  if (req.status === "pending") {
    return req.safetyReview?.required && !req.safetyReview?.approved
      ? "Admin safety review ke baad nurse assign hogi."
      : "Hum matching nurse dhoond rahe hain.";
  }
  if (req.status === "interview-scheduled") {
    return "Long-term nurse ka AI interview scheduled hai.";
  }
  if (req.status === "matched") {
    return req.visit?.checkedInAt
      ? "Visit start ho chuki hai."
      : "Nurse aa rahi hai. Pahunchne par check-in OTP share karein.";
  }
  if (req.status === "in-progress") {
    return "Visit chal rahi hai. Kaam complete hone par check-out OTP share karein.";
  }
  if (req.status === "completed") {
    return req.nurseRating?.ratedAt
      ? "Visit complete ho gayi hai."
      : "Visit complete ho gayi hai. Nurse ko rating dein.";
  }
  if (req.status === "cancelled") return "Request cancel ho gayi hai.";
  return "Request status update ka wait karein.";
}

function NotificationDropdown({ notifications }) {
  return (
    <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="font-semibold text-gray-900 text-sm">Notifications</p>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No notifications yet</p>
        ) : notifications.map(item => (
          <div key={item._id} className={`px-4 py-3 border-b border-gray-50 ${item.read ? "bg-white" : "bg-sky-50"}`}>
            <p className="text-sm text-gray-800 leading-snug">{item.message}</p>
            <p className="text-xs text-gray-400 mt-1">
              {item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SOS Dialog ───────────────────────────────────────────────
function SOSDialog({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-4xl">🚨</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Emergency SOS</h2>
          <p className="text-gray-500 mt-2 text-sm">Select an emergency action below</p>
        </div>
        <div className="space-y-3">
          <a
            href="tel:108"
            className="flex items-center justify-center gap-3 w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors"
          >
            <PhoneIcon /> Call 108 — Ambulance
          </a>
          <a
            href="tel:112"
            className="flex items-center justify-center gap-3 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            <PhoneIcon /> Call 112 — Police/Emergency
          </a>
          <button
            onClick={onClose}
            className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI Chat Modal ────────────────────────────────────────────
function AIChatModal({ onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Namaste! 🙏 Main Priya hoon, aapki AI health assistant. Aap Hindi, Hinglish ya English mein baat kar sakte hain. Aaj main aapki kya madad kar sakti hoon?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState("");
  const chatRecognitionRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => () => chatRecognitionRef.current?.stop(), []);

  const speechSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  function toggleChatMic() {
    setMicError("");

    if (!speechSupported) {
      setMicError("Mic is browser me supported nahi hai. Chrome me try karein.");
      return;
    }

    if (listening) {
      chatRecognitionRef.current?.stop();
      setListening(false);
      return;
    }

    chatRecognitionRef.current?.stop();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = event => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript || "";
      }
      const text = transcript.trim();
      if (text) setInput(current => `${current}${current.trim() ? " " : ""}${text}`);
    };
    recognition.onerror = event => {
      setMicError(event.error === "not-allowed"
        ? "Mic permission allow karein."
        : "Mic se text capture nahi ho paaya."
      );
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    chatRecognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    chatRecognitionRef.current?.stop();
    setListening(false);
    setMessages(m => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const history = messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text,
      }));
      const res = await axios.post("/api/ai/triage", {
        messages: [...history, { role: "user", content: text }],
      });
      const reply = res.data?.reply || res.data?.message || res.data?.response || "Samajh liya. Koi aur sawal?";
      setMessages(m => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Maafi chahti hoon, abhi thodi technical dikkat hai. Kuch der mein dobara try karein. 🙏" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl shadow-2xl flex flex-col" style={{ height: "85vh", maxHeight: "640px" }}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-sky-50 sm:rounded-t-2xl">
          <div className="h-10 w-10 rounded-full bg-sky-500 flex items-center justify-center text-white">
            <BotIcon />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sky-900">Priya — AI Health Assistant</p>
            <p className="text-xs text-sky-600">Hindi · Hinglish · English</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-sky-100 text-sky-700">
            <XIcon />
          </button>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 mr-2 mt-0.5 shrink-0 text-xs font-bold">P</div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-sky-500 text-white rounded-br-none"
                  : "bg-gray-100 text-gray-800 rounded-bl-none"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="h-7 w-7 rounded-full bg-sky-100 flex items-center justify-center mr-2 text-xs font-bold text-sky-600">P</div>
              <div className="bg-gray-100 px-3.5 py-2.5 rounded-2xl rounded-bl-none">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-gray-50"
              placeholder="Apni problem batayein..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
            />
            <button
              type="button"
              onClick={toggleChatMic}
              disabled={loading}
              className={`p-2.5 rounded-xl transition-colors ${
                listening
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-white text-sky-600 border border-sky-200 hover:bg-sky-50"
              } disabled:opacity-40`}
              title={listening ? "Stop mic" : "Speak"}
            >
              <MicIcon />
            </button>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors"
            >
              <SendIcon />
            </button>
          </div>
          {listening && <p className="mt-2 text-xs font-medium text-red-500">Listening...</p>}
          {micError && <p className="mt-2 text-xs text-red-600">{micError}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main Patient Dashboard ───────────────────────────────────
export default function PatientDashboard() {
  const { user, logout } = useAuth();

  const [showSOS, setShowSOS] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);

  // Book a Nurse state
  const [problem, setProblem] = useState("");
  const [requirements, setRequirements] = useState("");
  const [mode, setMode] = useState("temporary");
  const [address, setAddress] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookMsg, setBookMsg] = useState(null);
  const [patientLocation, setPatientLocation] = useState(null);
  const [locationMsg, setLocationMsg] = useState("");
  const [voiceLang, setVoiceLang] = useState("hi-IN");
  const [voiceTarget, setVoiceTarget] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);

  // My Requests state
  const [requests, setRequests] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [ratingDrafts, setRatingDrafts] = useState({});
  const [ratingSubmitting, setRatingSubmitting] = useState({});

  useEffect(() => {
    fetchRequests();
    fetchNotifications();

    const refreshTimer = setInterval(() => {
      fetchRequests();
      fetchNotifications();
    }, 15000);

    return () => {
      clearInterval(refreshTimer);
      recognitionRef.current?.stop();
    };
  }, []);

  const speechSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  function appendDictation(target, transcript) {
    const text = transcript.trim();
    if (!text) return;
    const setter = target === "problem" ? setProblem : setRequirements;
    setter(current => `${current}${current.trim() ? " " : ""}${text}`);
  }

  function toggleDictation(target) {
    setVoiceError("");

    if (!speechSupported) {
      setVoiceError("Mic dictation is not supported in this browser. Chrome me try karein.");
      return;
    }

    if (voiceTarget === target) {
      recognitionRef.current?.stop();
      setVoiceTarget(null);
      return;
    }

    recognitionRef.current?.stop();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLang;
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = event => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript || "";
      }
      appendDictation(target, transcript);
    };
    recognition.onerror = event => {
      setVoiceError(event.error === "not-allowed"
        ? "Mic permission allow karein, phir dobara try karein."
        : "Mic se text capture nahi ho paaya. Dobara try karein."
      );
      setVoiceTarget(null);
    };
    recognition.onend = () => setVoiceTarget(current => current === target ? null : current);

    recognitionRef.current = recognition;
    setVoiceTarget(target);
    recognition.start();
  }

  function getBrowserLocation() {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        pos => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  async function capturePatientLocation() {
    setLocationMsg("Location detect kar rahe hain...");
    const location = await getBrowserLocation();
    if (location) {
      setPatientLocation(location);
      setLocationMsg("Pickup location saved for nearest nurse matching.");
    } else {
      setLocationMsg("Location permission nahi mili. City/address ke basis par nurse match hogi.");
    }
    return location;
  }

  function DictationControls({ target }) {
    const active = voiceTarget === target;
    const label = target === "problem" ? "problem" : "requirements";

    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => toggleDictation(target)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            active
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
          }`}
        >
          <MicIcon /> {active ? "Stop mic" : `Speak ${label}`}
        </button>
        <select
          value={voiceLang}
          onChange={e => setVoiceLang(e.target.value)}
          disabled={Boolean(voiceTarget)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
        >
          <option value="hi-IN">Hindi / Hinglish</option>
          <option value="en-IN">English India</option>
          <option value="en-US">English US</option>
        </select>
        {active && <span className="text-xs font-medium text-red-500">Listening...</span>}
      </div>
    );
  }

  async function fetchRequests() {
    setLoadingReqs(true);
    try {
      const res = await axios.get("/api/request/patient");
      // ✅ FIX: Backend returns { success, requests, pagination } — not array directly
      setRequests(res.data?.requests || []);
    } catch {
      setRequests([]);
    } finally {
      setLoadingReqs(false);
    }
  }

  async function fetchNotifications() {
    try {
      const res = await axios.get("/api/notifications");
      setNotifications(res.data?.notifications || []);
      setNotifCount(res.data?.unreadCount || 0);
    } catch {
      setNotifications([]);
      setNotifCount(0);
    }
  }

  async function openNotifications() {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next && notifCount > 0) {
      try {
        await axios.put("/api/notifications/read");
        setNotifCount(0);
        setNotifications(list => list.map(item => ({ ...item, read: true })));
      } catch {
        fetchNotifications();
      }
    }
  }

  async function handleBookSubmit(e) {
    e.preventDefault();
    if (!problem.trim() || !address.trim()) return;
    setSubmitting(true);
    setBookMsg(null);
    try {
      const locationForRequest = mode === "temporary"
        ? (patientLocation || await capturePatientLocation())
        : patientLocation;
      const formData = new FormData();
      formData.append("problem", problem);
      formData.append("requirements", requirements);
      formData.append("mode", mode);
      formData.append("address", address);
      if (locationForRequest) formData.append("patientLocation", JSON.stringify(locationForRequest));
      if (user?.city) formData.append("city", user.city);
      attachments.forEach(item => {
        formData.append("attachments", item.file);
        formData.append("attachmentSources", item.source);
      });

      await axios.post("/api/request", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBookMsg({ type: "success", text: "✅ Request submitted! We'll match you with a nurse soon." });
      setProblem("");
      setRequirements("");
      setAddress("");
      setAttachments([]);
      fetchRequests();
      fetchNotifications();
    } catch (err) {
      // ✅ FIX: Backend returns err.response.data.error (not .message)
      setBookMsg({ type: "error", text: err?.response?.data?.error || "❌ Failed to submit request. Try again." });
    } finally {
      setSubmitting(false);
    }
  }

  function addAttachments(files, source) {
    const nextFiles = Array.from(files || []).map(file => ({ file, source }));
    setAttachments(list => [...list, ...nextFiles].slice(0, 5));
  }

  function removeAttachment(index) {
    setAttachments(list => list.filter((_, i) => i !== index));
  }

  function updateRatingDraft(requestId, patch) {
    setRatingDrafts(drafts => ({
      ...drafts,
      [requestId]: {
        score: 5,
        behavior: "",
        careQuality: "",
        comment: "",
        ...(drafts[requestId] || {}),
        ...patch,
      },
    }));
  }

  async function submitRating(requestId) {
    const draft = ratingDrafts[requestId] || { score: 5 };
    setRatingSubmitting(map => ({ ...map, [requestId]: true }));
    try {
      await axios.post(`/api/request/${requestId}/rating`, {
        score: draft.score || 5,
        behavior: draft.behavior,
        careQuality: draft.careQuality,
        comment: draft.comment,
      });
      await Promise.all([fetchRequests(), fetchNotifications()]);
      setRatingDrafts(drafts => {
        const next = { ...drafts };
        delete next[requestId];
        return next;
      });
    } catch (err) {
      setBookMsg({ type: "error", text: err?.response?.data?.error || "Rating submit nahi ho paayi." });
    } finally {
      setRatingSubmitting(map => ({ ...map, [requestId]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100/50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-sky-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-sky-500 flex items-center justify-center text-white">
              <HeartIcon />
            </div>
            <div>
              <p className="font-bold text-sky-900 leading-none">SevaSetu</p>
              <p className="text-xs text-sky-500 mt-0.5">{user?.name || user?.email || "Patient"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={openNotifications}
                className="relative p-2 rounded-xl bg-white border border-sky-100 text-gray-500 hover:text-sky-600 hover:border-sky-200 transition-colors"
              >
                <BellIcon />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {notifCount}
                  </span>
                )}
              </button>
              {showNotifications && <NotificationDropdown notifications={notifications} />}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOutIcon /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-32">

        {/* ── SOS Button ── */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowSOS(true)}
            className="relative h-28 w-28 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-2xl shadow-red-400/50 transition-all duration-200 flex flex-col items-center justify-center"
          >
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
            <span className="text-3xl font-black tracking-wider">SOS</span>
            <span className="text-xs font-medium opacity-80 mt-0.5">Emergency</span>
          </button>
        </div>

        {/* ── Book a Nurse ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
          <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-5 py-4">
            <h2 className="text-white font-bold text-lg">Book a Nurse</h2>
            <p className="text-sky-100 text-sm mt-0.5">Describe your need and we'll find the right nurse</p>
          </div>
          <form onSubmit={handleBookSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Describe your problem</label>
              <textarea
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none bg-gray-50"
                placeholder="e.g. My mother needs wound dressing after knee surgery..."
                value={problem}
                onChange={e => setProblem(e.target.value)}
                required
              />
              <DictationControls target="problem" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Specific requirements</label>
              <textarea
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none bg-gray-50"
                placeholder="e.g. Female nurse preferred, night care, injection, catheter care, post-surgery monitoring..."
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
              />
              <DictationControls target="requirements" />
              {voiceError && (
                <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {voiceError}
                </p>
              )}
            </div>

            {/* Mode toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Type</label>
              <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                {[
                  { val: "temporary", label: "⚡ Temporary" },
                  { val: "longterm", label: "📅 Long-term" },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setMode(opt.val)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      mode === opt.val
                        ? "bg-sky-500 text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "temporary" && (
              <div className="rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-900">Pickup location</p>
                    <p className="text-xs text-orange-700">
                      Nearest nurse aur arrival time dikhane ke liye current location use hogi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={capturePatientLocation}
                    className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700"
                  >
                    Use current location
                  </button>
                </div>
                {(locationMsg || patientLocation) && (
                  <p className="mt-2 text-xs text-orange-700">
                    {locationMsg || "Pickup location ready."}
                    {patientLocation?.accuracy ? ` Accuracy: ${Math.round(patientLocation.accuracy)}m` : ""}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Address</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-gray-50"
                placeholder="Flat 4B, Sector 15, Noida, UP"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hospital file / reports</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-sm font-semibold py-3 cursor-pointer hover:bg-sky-100 transition">
                  <PaperclipIcon /> Add from gallery
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => addAttachments(e.target.files, "gallery")}
                  />
                </label>
                <label className="flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-sm font-semibold py-3 cursor-pointer hover:bg-teal-100 transition">
                  <CameraIcon /> Take photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => addAttachments(e.target.files, "camera")}
                  />
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((item, index) => (
                    <div key={`${item.file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{item.file.name}</p>
                        <p className="text-[11px] text-gray-400">{item.source === "camera" ? "Camera photo" : "Gallery/file"} · {(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button type="button" onClick={() => removeAttachment(index)} className="text-xs text-red-500 hover:text-red-600">Remove</button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">Up to 5 files. JPG, PNG, WEBP or PDF.</p>
            </div>

            {bookMsg && (
              <div className={`text-sm px-3.5 py-2.5 rounded-xl ${bookMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {bookMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        </div>

        {/* ── My Requests ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 text-lg">My Requests</h2>
            <button onClick={fetchRequests} className="text-xs text-sky-600 hover:underline">Refresh</button>
          </div>
          {loadingReqs ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-sky-200 p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">🩺</p>
              <p className="text-sm">No requests yet. Book a nurse above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req._id || req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-gray-900 text-sm leading-snug flex-1">{req.problem}</p>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span>{req.mode === "longterm" ? "📅 Long-term" : "⚡ Temporary"}</span>
                    {req.amount > 0 && (
                      <span className="font-semibold text-emerald-600">
                        ₹{Number(req.amount).toLocaleString()}
                      </span>
                    )}
                    <span>📍 {req.address || "—"}</span>
                    {/* ✅ FIX: Show created date instead of raw ID */}
                    <span>{req.createdAt ? new Date(req.createdAt).toLocaleDateString("en-IN") : ""}</span>
                  </div>
                  <div className="mt-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
                    {getPatientNextStep(req)}
                  </div>
                  {/* ✅ FIX: Nurse is populated as object under nurseId, not nurseId.name */}
                  {req.nurseId?.name && (
                    <div className="mt-2 text-xs bg-sky-50 text-sky-700 px-3 py-1.5 rounded-lg border border-sky-100">
                      👩‍⚕️ Nurse assigned: <strong>{req.nurseId.name}</strong>
                      {req.nurseId.phone && <span className="ml-2 text-sky-500">📞 {req.nurseId.phone}</span>}
                    </div>
                  )}
                  {req.mode === "temporary" && req.nurseId && ["matched", "in-progress"].includes(req.status) && (
                    <div className="mt-2 rounded-xl border border-orange-100 bg-orange-50 p-3 text-xs text-orange-800">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-orange-950">Nurse is on the way</p>
                          <p className="mt-1">
                            {req.nurseId?.name || "Nurse"} {req.nurseId?.phone ? `· ${req.nurseId.phone}` : ""}
                          </p>
                          <p className="mt-1">
                            ETA: <strong>{req.rideTracking?.estimatedArrivalMinutes || 45} min</strong>
                            {req.rideTracking?.estimatedDistanceKm ? ` · ${req.rideTracking.estimatedDistanceKm} km away` : ""}
                          </p>
                          {req.arrivalEtaAt && (
                            <p className="mt-1">Expected by {new Date(req.arrivalEtaAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                          )}
                        </div>
                        {req.rideTracking?.nurseStartLocation?.lat && (
                          <a
                            href={`https://maps.google.com/?q=${req.rideTracking.nurseStartLocation.lat},${req.rideTracking.nurseStartLocation.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-lg bg-white px-3 py-2 font-semibold text-orange-700 border border-orange-200"
                          >
                            Map
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {req.safetyReview?.required && (
                    <div className="mt-2 text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-100">
                      Safety review active: {req.safetyReview.reason || "extra verification required"}
                      {req.safetyReview.approved ? " · Approved by admin" : " · Pending admin review"}
                    </div>
                  )}
                  {req.nurseId && ["matched", "in-progress"].includes(req.status) && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-teal-700">
                        Check-in OTP
                        <strong className="block text-base tracking-widest">{req.visit?.checkInOtp || "—"}</strong>
                      </div>
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-700">
                        Check-out OTP
                        <strong className="block text-base tracking-widest">{req.visit?.checkOutOtp || "—"}</strong>
                      </div>
                    </div>
                  )}
                  {req.arrivalEtaAt && (
                    <div className="mt-2 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-100">
                      🚕 Estimated nurse arrival: <strong>{new Date(req.arrivalEtaAt).toLocaleString("en-IN")}</strong>
                    </div>
                  )}
                  {req.interviewSchedule?.startsAt && (
                    <div className="mt-2 text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-100">
                      🎥 Long-term nurse AI interview scheduled: <strong>{new Date(req.interviewSchedule.startsAt).toLocaleString("en-IN")}</strong>
                    </div>
                  )}
                  {req.matchingReason && (
                    <div className="mt-2 text-xs bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg border border-teal-100">
                      Match logic: {req.matchingReason}
                    </div>
                  )}
                  {req.attachments?.length > 0 && (
                    <div className="mt-2 text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-100">
                      📎 {req.attachments.length} medical file(s) uploaded
                    </div>
                  )}
                  {req.aiSummary && (
                    <div className="mt-2 text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-100">
                      🤖 AI Summary: {req.aiSummary}
                    </div>
                  )}
                  {req.status === "completed" && req.nurseId && (
                    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                      {req.nurseRating?.ratedAt ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-amber-800">Your rating</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map(star => (
                                <StarIcon key={star} filled={star <= Number(req.nurseRating?.score || 0)} />
                              ))}
                            </div>
                          </div>
                          {(req.nurseRating?.behavior || req.nurseRating?.careQuality) && (
                            <p className="mt-1 text-xs text-amber-700">
                              Behavior: {req.nurseRating.behavior || "—"} · Care: {req.nurseRating.careQuality || "—"}
                            </p>
                          )}
                          {req.nurseRating?.comment && <p className="mt-1 text-xs text-gray-600">{req.nurseRating.comment}</p>}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-900">Rate nurse care</p>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map(star => {
                                const draft = ratingDrafts[req._id || req.id] || { score: 5 };
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => updateRatingDraft(req._id || req.id, { score: star })}
                                    className="p-0.5"
                                  >
                                    <StarIcon filled={star <= Number(draft.score || 5)} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={(ratingDrafts[req._id || req.id] || {}).behavior || ""}
                              onChange={e => updateRatingDraft(req._id || req.id, { behavior: e.target.value })}
                              className="rounded-lg border border-amber-100 bg-white px-2 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-amber-200"
                            >
                              <option value="">Behavior</option>
                              <option value="excellent">Excellent</option>
                              <option value="good">Good</option>
                              <option value="average">Average</option>
                              <option value="poor">Poor</option>
                            </select>
                            <select
                              value={(ratingDrafts[req._id || req.id] || {}).careQuality || ""}
                              onChange={e => updateRatingDraft(req._id || req.id, { careQuality: e.target.value })}
                              className="rounded-lg border border-amber-100 bg-white px-2 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-amber-200"
                            >
                              <option value="">Care quality</option>
                              <option value="excellent">Excellent</option>
                              <option value="good">Good</option>
                              <option value="average">Average</option>
                              <option value="poor">Poor</option>
                            </select>
                          </div>
                          <textarea
                            rows={2}
                            value={(ratingDrafts[req._id || req.id] || {}).comment || ""}
                            onChange={e => updateRatingDraft(req._id || req.id, { comment: e.target.value })}
                            placeholder="Nurse ka behavior, care, timing ya hygiene ke baare me likhein..."
                            className="w-full rounded-lg border border-amber-100 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-amber-200 resize-none"
                          />
                          <button
                            type="button"
                            onClick={() => submitRating(req._id || req.id)}
                            disabled={ratingSubmitting[req._id || req.id]}
                            className="w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                          >
                            {ratingSubmitting[req._id || req.id] ? "Submitting rating..." : "Submit Rating"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Stats footer ── */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { val: "3 Lakh+", label: "Verified Nurses" },
            { val: "1 Lakh+", label: "Happy Patients" },
            { val: "98%", label: "Satisfaction" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-sky-100 p-3 text-center shadow-sm">
              <p className="font-extrabold text-sky-600 text-lg leading-none">{s.val}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ── Floating AI Button ── */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 left-6 flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-3 rounded-full shadow-lg shadow-sky-400/40 transition-all active:scale-95"
      >
        <BotIcon />
        <span className="text-sm">AI Health Assistant</span>
      </button>

      {/* ── Modals ── */}
      {showSOS && <SOSDialog onClose={() => setShowSOS(false)} />}
      {showChat && <AIChatModal onClose={() => setShowChat(false)} />}
    </div>
  );
}
