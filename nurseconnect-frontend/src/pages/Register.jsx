import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LanguageSelector from "../components/LanguageSelector";
import axios from "../api/axios";
import {
  Heart, User, Stethoscope, Mail, Lock, Phone,
  MapPin, ChevronRight, Eye, EyeOff, CheckSquare, Square,
  Mic, MicOff, FileText,
} from "lucide-react";

const SPECIALIZATIONS = [
  "General Care","ICU","Emergency","Elder Care",
  "Pediatric","Physiotherapy","Wound Care",
];

const EXPERIENCE_OPTIONS = [
  { value: "1-2", label: "1–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "5+",  label: "5+ years"  },
  { value: "7+",  label: "7+ years"  },
];

const InputField = ({ icon: Icon, label, required, error, ...props }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
      {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
      {label}
      {required && <span className="text-red-400">*</span>}
    </label>
    <input
      className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 ${
        error
          ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100"
          : "border-gray-200 bg-gray-50 focus:border-sky-400 focus:bg-white focus:ring-sky-100"
      }`}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const FileUploadField = ({ label, required, file, error, accept, onChange }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
      <FileText className="h-3.5 w-3.5 text-gray-400" />
      {label}
      {required && <span className="text-red-400">*</span>}
    </label>
    <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition ${
      error
        ? "border-red-300 bg-red-50 text-red-600"
        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-teal-300 hover:bg-white"
    }`}>
      <span className="min-w-0 truncate">{file?.name || "Upload PDF or image"}</span>
      <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-teal-700 shadow-sm">
        Choose
      </span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={event => onChange(event.target.files?.[0] || null)}
      />
    </label>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

export default function Register() {
  // ✅ FIX: Use AuthContext register instead of raw axios
  const { register, loading, error: authError } = useAuth();
  const [role, setRole] = useState("patient");

  const [form, setForm] = useState({
    fullName: "", email: "", password: "",
    phone: "", address: "", city: "",
    specializations: [], experience: "", gender: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [nurseStep, setNurseStep] = useState("form");
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [interviewAnswers, setInterviewAnswers] = useState([]);
  const [interviewFeedback, setInterviewFeedback] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [assessing, setAssessing] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [nurseDocs, setNurseDocs] = useState({
    nursingCert: null,
    idProof: null,
    resume: null,
  });

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    setFieldErrors(e => ({ ...e, [key]: "" }));
  }

  function toggleSpec(spec) {
    setForm(f => ({
      ...f,
      specializations: f.specializations.includes(spec)
        ? f.specializations.filter(s => s !== spec)
        : [...f.specializations, spec],
    }));
  }

  function updateInterviewAnswer(index, value) {
    setInterviewAnswers(answers => answers.map((answer, i) => i === index ? value : answer));
    setInterviewFeedback(feedback => feedback.map((item, i) => i === index ? null : item));
    setFieldErrors(e => ({ ...e, interview: "" }));
  }

  function updateNurseDoc(key, file) {
    setNurseDocs(docs => ({ ...docs, [key]: file || null }));
    setFieldErrors(e => ({ ...e, [key]: "" }));
  }

  function startVoiceAnswer() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Is browser me voice typing support nahi hai. Chrome/Edge me try karein.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalTranscript = "";
    setListening(true);
    setVoiceError("");

    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }

      const spokenText = `${finalTranscript} ${interimTranscript}`.trim();
      if (spokenText) {
        const existing = interviewAnswers[questionIndex]?.trim();
        updateInterviewAnswer(questionIndex, `${existing ? `${existing} ` : ""}${spokenText}`);
      }
    };

    recognition.onerror = () => {
      setVoiceError("Voice capture failed. Mic permission allow karke dobara try karein.");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }

  async function assessCurrentAnswer() {
    const answer = interviewAnswers[questionIndex]?.trim();
    if (!answer || answer.length < 40) {
      setFieldErrors(e => ({ ...e, interview: "Clear real-world clinical steps likhiye. Minimum 40 characters required." }));
      return;
    }

    setAssessing(true);
    setError("");
    try {
      const { data } = await axios.post("/api/auth/nurse-interview/assess", {
        question: interviewQuestions[questionIndex],
        answer,
        questionIndex,
        candidate: {
          name: form.fullName,
          city: form.city,
          specializations: form.specializations,
          experience: form.experience,
        },
      });

      setInterviewFeedback(feedback => feedback.map((item, i) => i === questionIndex ? data : item));
      if (!data.safe) {
        setFieldErrors(e => ({
          ...e,
          interview: data.concern || "AI ne answer unsafe/incomplete mark kiya hai. Answer improve karke dobara submit karein.",
        }));
        return;
      }

      setFieldErrors(e => ({ ...e, interview: "" }));
      if (questionIndex < interviewQuestions.length - 1) {
        setQuestionIndex(i => i + 1);
      }
    } catch (err) {
      setError(err?.response?.data?.error || "AI interview agent abhi answer assess nahi kar paaya.");
    } finally {
      setAssessing(false);
    }
  }

  async function startAiInterview() {
    setGeneratingQuestions(true);
    setError("");
    try {
      await axios.post("/api/auth/register/validate", {
        name: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role,
        specializations: form.specializations,
        experience: form.experience,
        gender: form.gender,
      });

      const { data } = await axios.post("/api/auth/nurse-interview/questions", {
        specializations: form.specializations,
        experience: form.experience,
        city: form.city,
      });

      const questions = data?.questions || [];
      setInterviewQuestions(questions);
      setInterviewAnswers(questions.map(() => ""));
      setInterviewFeedback(questions.map(() => null));
      setQuestionIndex(0);
      setNurseStep("interview");
    } catch (err) {
      const message = err?.response?.data?.error || "AI interview questions generate nahi ho paaye.";
      setError(message);
      if (err?.response?.status === 409 && message.toLowerCase().includes("email")) {
        setFieldErrors(e => ({ ...e, email: message }));
      }
    } finally {
      setGeneratingQuestions(false);
    }
  }

  function validate() {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email";
    if (!form.password.trim()) errs.password = "Password is required";
    else if (form.password.length < 6) errs.password = "Min. 6 characters";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    if (role === "nurse" && form.specializations.length === 0)
      errs.specializations = "Select at least one";
    if (role === "nurse" && !form.experience) errs.experience = "Select experience";
    if (role === "nurse" && !form.gender) errs.gender = "Select gender";
    if (role === "nurse" && !nurseDocs.nursingCert) errs.nursingCert = "Upload nursing certificate";
    if (role === "nurse" && !nurseDocs.idProof) errs.idProof = "Upload ID proof";
    if (role === "nurse" && !nurseDocs.resume) errs.resume = "Upload resume/CV";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    if (role === "nurse" && nurseStep === "form") {
      setError("");
      await startAiInterview();
      return;
    }

    if (role === "nurse") {
      const incomplete = interviewAnswers.length !== interviewQuestions.length || interviewAnswers.some(answer => answer.trim().length < 40);
      if (incomplete) {
        setFieldErrors(e => ({ ...e, interview: "Har answer me clear clinical steps likhiye. Minimum 40 characters required." }));
        return;
      }
    }

    setError("");
    let payload;
    if (role === "nurse") {
      payload = new FormData();
      payload.append("name", form.fullName);
      payload.append("email", form.email);
      payload.append("password", form.password);
      payload.append("phone", form.phone);
      payload.append("address", form.address);
      payload.append("city", form.city);
      payload.append("role", role);
      payload.append("experience", form.experience);
      payload.append("gender", form.gender);
      form.specializations.forEach(spec => payload.append("specializations", spec));
      interviewAnswers.forEach(answer => payload.append("interviewAnswers", answer));
      interviewQuestions.forEach(question => payload.append("interviewQuestions", question));
      payload.append("nursingCert", nurseDocs.nursingCert);
      payload.append("idProof", nurseDocs.idProof);
      payload.append("resume", nurseDocs.resume);
    } else {
      payload = {
        name: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
        city: form.city,
        role,
      };
    }

    // ✅ FIX: AuthContext register handles token save + navigation
    const result = await register(payload);
    if (!result.success) {
      setError(result.error || "Registration failed. Try again.");
      if (role === "nurse") setNurseStep("interview");
    }
  }

  function handleRoleChange(nextRole) {
    setRole(nextRole);
    setError("");
    setFieldErrors({});
    setNurseStep("form");
    setQuestionIndex(0);
    setInterviewQuestions([]);
    setInterviewAnswers([]);
    setInterviewFeedback([]);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LanguageSelector compact />
        </div>
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-200 mb-4">
            <Heart className="h-8 w-8 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">Join SevaSetu today</p>
        </div>

        <div className="rounded-2xl bg-white shadow-xl border border-sky-100 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-sky-400 via-sky-500 to-teal-500" />
          <div className="p-8">
            {/* Role toggle */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-7">
              {["patient","nurse"].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                    role === r ? "bg-white text-sky-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {r === "patient" ? <User className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            {(error || authError) && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-5">
                {error || authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {role === "nurse" && nurseStep === "interview" ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
                    <p className="text-sm font-semibold text-teal-900">Short Clinical Interview</p>
                    <p className="text-xs text-teal-700 mt-1">
                      AI questions aapki specialization ke according hain. Final score 10 me se hoga; 7+ selected, below 7 rejected.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Question {questionIndex + 1} of {interviewQuestions.length}
                      </label>
                      <div className="flex gap-1">
                        {interviewQuestions.map((_, i) => (
                          <span key={i} className={`h-1.5 w-5 rounded-full ${i <= questionIndex ? "bg-teal-500" : "bg-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{interviewQuestions[questionIndex]}</p>
                    <textarea
                      rows={5}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 resize-none"
                      placeholder="Real patient situation ke hisaab se practical steps likhiye..."
                      value={interviewAnswers[questionIndex]}
                      onChange={e => updateInterviewAnswer(questionIndex, e.target.value)}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={startVoiceAnswer}
                        disabled={listening}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          listening
                            ? "border-red-200 bg-red-50 text-red-600"
                            : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                        }`}
                      >
                        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        {listening ? "Listening..." : "Speak Answer"}
                      </button>
                      <p className="text-xs text-gray-400">Hindi/Hinglish voice supported</p>
                    </div>
                    {voiceError && <p className="text-xs text-red-500">{voiceError}</p>}
                  </div>

                  {interviewFeedback[questionIndex] && (
                    <div className={`rounded-xl px-4 py-3 text-sm border ${
                      interviewFeedback[questionIndex].safe
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      <p className="font-semibold">AI Agent Feedback</p>
                      <p className="mt-1">{interviewFeedback[questionIndex].acknowledgement}</p>
                      {interviewFeedback[questionIndex].concern && <p className="mt-1">{interviewFeedback[questionIndex].concern}</p>}
                    </div>
                  )}

                  {fieldErrors.interview && <p className="text-xs text-red-500">{fieldErrors.interview}</p>}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => questionIndex > 0 ? setQuestionIndex(i => i - 1) : setNurseStep("form")}
                      className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                    >
                      Back
                    </button>
                    {questionIndex < interviewQuestions.length - 1 ? (
                      <button
                        type="button"
                        onClick={assessCurrentAnswer}
                        disabled={assessing}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-teal-600 hover:to-teal-700 disabled:opacity-50"
                      >
                        {assessing ? "AI assessing..." : <>Submit to AI <ChevronRight className="h-4 w-4" /></>}
                      </button>
                    ) : (
                    <button
                      type="submit"
                      disabled={loading || assessing}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-teal-600 hover:to-teal-700 disabled:opacity-50"
                    >
                      {loading ? "Final AI score..." : <>Create Account <ChevronRight className="h-4 w-4" /></>}
                    </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
              <InputField icon={User} label="Full Name" required placeholder="Rahul Sharma"
                value={form.fullName} onChange={e => update("fullName", e.target.value)} error={fieldErrors.fullName} />
              <InputField icon={Mail} label="Email Address" required type="email" placeholder="you@example.com"
                value={form.email} onChange={e => update("email", e.target.value)} error={fieldErrors.email} />

              {/* Password */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Lock className="h-3.5 w-3.5 text-gray-400" /> Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required value={form.password}
                    onChange={e => update("password", e.target.value)} placeholder="Min. 6 characters"
                    className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none transition focus:ring-2 ${
                      fieldErrors.password ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-sky-400 focus:ring-sky-100"
                    }`} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
              </div>

              <InputField icon={Phone} label="Phone Number" required type="tel" placeholder="+91 98765 00000"
                value={form.phone} onChange={e => update("phone", e.target.value)} error={fieldErrors.phone} />
              <InputField icon={MapPin} label="Address" placeholder="Flat 12, Sector 5"
                value={form.address} onChange={e => update("address", e.target.value)} />
              <InputField label="City" placeholder="Noida / Mumbai / Delhi…"
                value={form.city} onChange={e => update("city", e.target.value)} />

              {/* Nurse-only */}
              {role === "nurse" && (
                <>
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      Specializations <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SPECIALIZATIONS.map(spec => {
                        const selected = form.specializations.includes(spec);
                        return (
                          <button key={spec} type="button" onClick={() => toggleSpec(spec)}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium text-left transition ${
                              selected ? "border-teal-400 bg-teal-50 text-teal-700" : "border-gray-200 bg-gray-50 text-gray-600"
                            }`}>
                            {selected ? <CheckSquare className="h-3.5 w-3.5 text-teal-500 shrink-0" /> : <Square className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
                            {spec}
                          </button>
                        );
                      })}
                    </div>
                    {fieldErrors.specializations && <p className="text-xs text-red-500">{fieldErrors.specializations}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Experience <span className="text-red-400">*</span></label>
                    <select value={form.experience} onChange={e => update("experience", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                      <option value="">Select experience…</option>
                      {EXPERIENCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {fieldErrors.experience && <p className="text-xs text-red-500">{fieldErrors.experience}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Gender <span className="text-red-400">*</span></label>
                    <select value={form.gender} onChange={e => update("gender", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                      <option value="">Select gender…</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                    {fieldErrors.gender && <p className="text-xs text-red-500">{fieldErrors.gender}</p>}
                  </div>

                  <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-teal-900">Verification Documents</p>
                      <p className="text-xs text-teal-700 mt-0.5">
                        Admin review ke baad hi profile patients ko match hogi.
                      </p>
                    </div>
                    <FileUploadField
                      label="Nursing Certificate / Degree"
                      required
                      accept="image/*,application/pdf"
                      file={nurseDocs.nursingCert}
                      error={fieldErrors.nursingCert}
                      onChange={file => updateNurseDoc("nursingCert", file)}
                    />
                    <FileUploadField
                      label="Government ID Proof"
                      required
                      accept="image/*,application/pdf"
                      file={nurseDocs.idProof}
                      error={fieldErrors.idProof}
                      onChange={file => updateNurseDoc("idProof", file)}
                    />
                    <FileUploadField
                      label="Resume / CV"
                      required
                      accept="application/pdf,image/*"
                      file={nurseDocs.resume}
                      error={fieldErrors.resume}
                      onChange={file => updateNurseDoc("resume", file)}
                    />
                  </div>
                </>
              )}

              <button type="submit" disabled={loading || generatingQuestions}
                className={`mt-2 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition disabled:opacity-50 ${
                  role === "nurse" ? "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                                  : "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700"
                }`}>
                {loading || generatingQuestions ? "Preparing AI interview..." : role === "nurse" ? <> Start AI Interview <ChevronRight className="h-4 w-4" /></> : <> Create Account <ChevronRight className="h-4 w-4" /></>}
              </button>
                </>
              )}
            </form>
          </div>

          <div className="px-8 pb-8 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
