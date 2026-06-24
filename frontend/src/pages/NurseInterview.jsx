import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AgentAvatar from "../components/interview/AgentAvatar";
import CameraFeed from "../components/interview/CameraFeed";
import InterviewControls from "../components/interview/InterviewControls";
import InterviewReport from "../components/interview/InterviewReport";
import TranscriptPanel from "../components/interview/TranscriptPanel";
import useFaceDetection from "../hooks/useFaceDetection";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import useSpeechSynthesis from "../hooks/useSpeechSynthesis";
import {
  ATTENTION_MESSAGES,
  buildDoubtResponse,
  generateFinalReport,
  generateNextAgentResponse,
  saveInterviewReport,
} from "../utils/geminiInterview";
import { DOUBT_KEYWORDS, getFirstName, includesAny, READY_KEYWORDS } from "../utils/interviewQuestions";

const OPENING_TEXT = "Namaste! Main hun Dr. NIDHI — NurseConnect ki AI Interview Agent. Aaj main aapka interview lunga NurseConnect ke home nursing program ke liye. Ghabrayein mat — yeh ek friendly conversation hai. Bas naturally baat karein jaise aap kisi se baat karte hain. Interview mein 5 questions honge, har question ke liye 3 minute milenge, aur interview maximum 20 minute mein finish ho jayega. Kya aap taiyaar hain?";
const TOTAL_QUESTIONS = 5;
const QUESTION_TIME_MS = 3 * 60 * 1000;
const MAX_INTERVIEW_MS = 20 * 60 * 1000;
const ANSWER_SETTLE_MS = 4800;
const INTERRUPT_KEYWORDS = [...DOUBT_KEYWORDS, "ai suno", "ai ruk", "ruko", "doubt hai", "ek doubt", "suno"];
const LANGUAGE_MODES = [
  { id: "hinglish", label: "Hinglish", lang: "en-IN" },
  { id: "hindi", label: "Hindi", lang: "hi-IN" },
  { id: "english", label: "English", lang: "en-IN" },
];

function makeTranscript(role, text) {
  return { id: `${Date.now()}-${Math.random()}`, role, text, at: Date.now() };
}

function formatClock(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export default function NurseInterview() {
  const { requestId } = useParams();
  const { user } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const startedAtRef = useRef(null);
  const answersRef = useRef([]);
  const questionsRef = useRef([]);
  const transcriptRef = useRef([]);
  const answerDraftRef = useRef("");
  const currentIndexRef = useRef(-1);
  const awaitingReadyRef = useRef(false);
  const handlingAnswerRef = useRef(false);
  const speakingRef = useRef(false);
  const lastInterruptRef = useRef(0);
  const answerSettleTimerRef = useRef(null);
  const micFrameRef = useRef(null);
  const questionIntervalRef = useRef(null);
  const questionTimeoutRef = useRef(null);
  const totalTimeoutRef = useRef(null);
  const questionDeadlineRef = useRef(null);

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [interviewActive, setInterviewActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState("Setup camera and mic");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [transcript, setTranscript] = useState([]);
  const [interim, setInterim] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [volume, setVolume] = useState(0.95);
  const [speechMode, setSpeechMode] = useState("hinglish");
  const [micLevel, setMicLevel] = useState(0);
  const [voiceDetected, setVoiceDetected] = useState(false);
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState(Math.round(QUESTION_TIME_MS / 1000));
  const [report, setReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const candidateName = user?.name || request?.nurseId?.name || "Priya";
  const firstName = getFirstName(candidateName);
  const recognitionLang = LANGUAGE_MODES.find(mode => mode.id === speechMode)?.lang || "en-IN";

  const addTranscript = useCallback((role, text) => {
    if (!text) return;
    const item = makeTranscript(role, text);
    transcriptRef.current = [...transcriptRef.current, item];
    setTranscript(transcriptRef.current);
  }, []);

  const { speak, cancel, speaking, voiceReady } = useSpeechSynthesis({ volume });

  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  const say = useCallback(async (text, options = {}) => {
    addTranscript("agent", text);
    setStatus(options.status || "Dr. NIDHI speaking");
    await speak(text);
  }, [addTranscript, speak]);

  const onAttentionEvent = useCallback((event) => {
    const msg = event.type === "looking_away"
      ? ATTENTION_MESSAGES.lookAway(firstName)
      : event.type === "face_missing"
        ? ATTENTION_MESSAGES.faceGone(firstName)
        : event.type === "multiple_faces"
          ? ATTENTION_MESSAGES.multipleFaces()
          : event.type === "movement"
            ? ATTENTION_MESSAGES.movement(firstName)
            : event.type === "too_far"
              ? ATTENTION_MESSAGES.tooFar(firstName)
              : event.message;
    say(msg, { status: "Attention reminder" });
  }, [firstName, say]);

  const { modelsReady, faceState, events: attentionEvents } = useFaceDetection({
    videoRef,
    enabled: cameraReady && interviewActive && !paused && !report,
    onAttentionEvent,
  });

  const scheduleState = useMemo(() => {
    const startsAt = request?.interviewSchedule?.startsAt;
    if (!startsAt) return { canStart: true, label: "Interview ready" };
    const now = Date.now();
    const start = new Date(startsAt).getTime();
    const end = request.interviewSchedule?.endsAt
      ? new Date(request.interviewSchedule.endsAt).getTime()
      : start + 30 * 60 * 1000;
    const canStart = now >= start - 10 * 60 * 1000 && now <= end + 15 * 60 * 1000;
    const label = canStart ? "Interview window open" : `Scheduled: ${new Date(startsAt).toLocaleString("en-IN")}`;
    return { canStart, label };
  }, [request]);

  async function fetchRequest() {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/request/${requestId}/interview`);
      setRequest(data.request);
    } catch (err) {
      setSetupError(err?.response?.data?.error || "Interview request load nahi ho paayi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequest();
    return () => {
      window.clearTimeout(answerSettleTimerRef.current);
      window.clearTimeout(questionTimeoutRef.current);
      window.clearTimeout(totalTimeoutRef.current);
      window.clearInterval(questionIntervalRef.current);
      window.cancelAnimationFrame(micFrameRef.current);
      streamRef.current?.getTracks()?.forEach(track => track.stop());
      cancel();
    };
  }, [requestId]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play?.().catch(() => {});
    }
  }, [cameraReady, interviewActive]);

  function clearQuestionTimer() {
    window.clearTimeout(questionTimeoutRef.current);
    window.clearInterval(questionIntervalRef.current);
    questionDeadlineRef.current = null;
  }

  function startQuestionTimer(index) {
    clearQuestionTimer();
    questionDeadlineRef.current = Date.now() + QUESTION_TIME_MS;
    setQuestionSecondsLeft(Math.round(QUESTION_TIME_MS / 1000));
    questionIntervalRef.current = window.setInterval(() => {
      if (!questionDeadlineRef.current) return;
      setQuestionSecondsLeft(Math.max(0, Math.ceil((questionDeadlineRef.current - Date.now()) / 1000)));
    }, 500);
    questionTimeoutRef.current = window.setTimeout(() => {
      handleQuestionTimeout(index);
    }, QUESTION_TIME_MS);
  }

  async function handleQuestionTimeout(index) {
    if (!interviewActive || paused || report || handlingAnswerRef.current || currentIndexRef.current !== index) return;
    clearQuestionTimer();
    window.clearTimeout(answerSettleTimerRef.current);
    const draft = answerDraftRef.current.trim();
    if (draft) {
      await submitCurrentAnswer(draft, { timedOut: true });
      return;
    }

    addTranscript("nurse", "[No answer submitted within 3 minutes]");
    const nextAnswers = [...answersRef.current];
    nextAnswers[index] = "No answer submitted within 3 minutes.";
    answersRef.current = nextAnswers;
    answerDraftRef.current = "";
    setAnswerDraft("");
    handlingAnswerRef.current = true;
    await say("Theek hai, time ho gaya. Main agla question poochti hoon.", { status: "Question time over" });
    handlingAnswerRef.current = false;
    await askQuestion(index + 1);
  }

  useEffect(() => {
    if (!micReady || !streamRef.current) return undefined;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return undefined;

    let closed = false;
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    const source = audioContext.createMediaStreamSource(streamRef.current);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const value = (data[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / data.length);
      const level = Math.min(100, Math.round(rms * 280));
      setMicLevel(level);
      setVoiceDetected(level > 7);
      if (!closed) micFrameRef.current = window.requestAnimationFrame(tick);
    };

    tick();
    return () => {
      closed = true;
      window.cancelAnimationFrame(micFrameRef.current);
      source.disconnect();
      audioContext.close();
      setMicLevel(0);
      setVoiceDetected(false);
    };
  }, [micReady]);

  async function startSetup() {
    setSetupError("");
    try {
      streamRef.current?.getTracks()?.forEach(track => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraReady(stream.getVideoTracks().some(track => track.readyState === "live"));
      setMicReady(stream.getAudioTracks().some(track => track.readyState === "live"));
      setStatus("Camera and mic ready");
    } catch {
      setSetupError("Camera/mic permission allow karke dobara try karein.");
      setCameraReady(false);
      setMicReady(false);
    }
  }

  const canStart = cameraReady && micReady && scheduleState.canStart && !submitting;

  async function startInterview() {
    if (!canStart) return;
    setInterviewActive(true);
    setPaused(false);
    setMuted(false);
    setReport(null);
    setTranscript([]);
    transcriptRef.current = [];
    answerDraftRef.current = "";
    setAnswerDraft("");
    window.clearTimeout(answerSettleTimerRef.current);
    setCurrentIndex(-1);
    currentIndexRef.current = -1;
    answersRef.current = [];
    questionsRef.current = [];
    setQuestions([]);
    setQuestionSecondsLeft(Math.round(QUESTION_TIME_MS / 1000));
    startedAtRef.current = new Date().toISOString();
    awaitingReadyRef.current = true;
    setStatus("Opening conversation");
    window.clearTimeout(totalTimeoutRef.current);
    totalTimeoutRef.current = window.setTimeout(() => {
      completeInterview(true);
    }, MAX_INTERVIEW_MS);
    window.setTimeout(() => startListening(), 300);
    await say(OPENING_TEXT, { status: "Opening" });
  }

  async function askQuestion(index) {
    clearQuestionTimer();
    if (index >= TOTAL_QUESTIONS) {
      await completeInterview();
      return;
    }

    currentIndexRef.current = index;
    setCurrentIndex(index);
    setStatus(`Thinking... (Question ${index + 1} of ${TOTAL_QUESTIONS})`);

    const history = transcriptRef.current.map(item => ({
      role: item.role,
      text: item.text,
    }));

    const response = await generateNextAgentResponse({
      nurseName: candidateName,
      conversationHistory: history,
      questionCount: index,
      totalQuestions: TOTAL_QUESTIONS,
      nurseCity: request?.city || user?.city,
      nurseSpecializations: user?.specializations,
    });

    if (response.includes("INTERVIEW_COMPLETE")) {
      const cleanResponse = response.replace("INTERVIEW_COMPLETE", "").trim();
      if (cleanResponse) await say(cleanResponse, { status: "Interview complete" });
      await completeInterview();
      return;
    }

    questionsRef.current[index] = response;
    setQuestions([...questionsRef.current]);
    await say(response, { status: `Question ${index + 1} of ${TOTAL_QUESTIONS}` });
    startQuestionTimer(index);
  }

  async function handleNurseFinal(text) {
    if (!text || handlingAnswerRef.current || paused || muted || report) return;
    setInterim("");

    if (speakingRef.current) {
      if (!includesAny(text, INTERRUPT_KEYWORDS)) return;
      if (Date.now() - lastInterruptRef.current < 2500) return;
      lastInterruptRef.current = Date.now();
      cancel();
      addTranscript("nurse", text);
      const question = questionsRef.current[currentIndexRef.current] || OPENING_TEXT;
      await say(`Haan ${firstName}, main ruk gayi. ${buildDoubtResponse(question, firstName)}`, { status: "Interrupted for doubt" });
      return;
    }

    if (awaitingReadyRef.current) {
      addTranscript("nurse", text);
      if (includesAny(text, READY_KEYWORDS)) {
        awaitingReadyRef.current = false;
        await askQuestion(0);
      } else {
        await say("Koi baat nahi. Jab aap ready hon, bas haan ya ready bol dijiye.", { status: "Waiting for ready" });
      }
      return;
    }

    const index = currentIndexRef.current;
    const question = questionsRef.current[index];
    if (!question) return;

    if (includesAny(text, DOUBT_KEYWORDS)) {
      addTranscript("nurse", text);
      await say(buildDoubtResponse(question, firstName), { status: "Clarifying question" });
      return;
    }

    const nextDraft = `${answerDraftRef.current ? `${answerDraftRef.current} ` : ""}${text}`.trim();
    answerDraftRef.current = nextDraft;
    setAnswerDraft(nextDraft);
    window.clearTimeout(answerSettleTimerRef.current);
    answerSettleTimerRef.current = window.setTimeout(() => {
      submitCurrentAnswer();
    }, ANSWER_SETTLE_MS);
  }

  async function submitCurrentAnswer(overrideText = "", options = {}) {
    const index = currentIndexRef.current;
    if (awaitingReadyRef.current || index < 0 || handlingAnswerRef.current) return;
    const text = (overrideText || answerDraftRef.current).trim();
    if (!text) return;

    clearQuestionTimer();
    window.clearTimeout(answerSettleTimerRef.current);
    addTranscript("nurse", options.timedOut ? `${text} [submitted when timer ended]` : text);
    handlingAnswerRef.current = true;
    const nextAnswers = [...answersRef.current];
    nextAnswers[index] = `${nextAnswers[index] ? `${nextAnswers[index]} ` : ""}${text}`.trim();
    answersRef.current = nextAnswers;
    answerDraftRef.current = "";
    setAnswerDraft("");

    window.setTimeout(async () => {
      handlingAnswerRef.current = false;
      await askQuestion(index + 1);
    }, 1500);
  }

  function updateAnswerDraft(value) {
    answerDraftRef.current = value;
    setAnswerDraft(value);
    window.clearTimeout(answerSettleTimerRef.current);
  }

  async function submitTypedInput() {
    const text = answerDraftRef.current.trim();
    if (!text || paused || muted || report) return;
    setInterim("");
    if (speakingRef.current) {
      cancel();
      addTranscript("nurse", text);
      const question = questionsRef.current[currentIndexRef.current] || OPENING_TEXT;
      await say(`Haan ${firstName}, main ruk gayi. ${buildDoubtResponse(question, firstName)}`, { status: "Interrupted for doubt" });
      answerDraftRef.current = "";
      setAnswerDraft("");
      return;
    }
    if (awaitingReadyRef.current) {
      answerDraftRef.current = "";
      setAnswerDraft("");
      await handleNurseFinal(text);
      return;
    }
    await submitCurrentAnswer(text);
  }

  async function completeInterview(early = false) {
    if (submitting) return;
    setSubmitting(true);
    clearQuestionTimer();
    window.clearTimeout(totalTimeoutRef.current);
    window.clearTimeout(answerSettleTimerRef.current);
    stopListening();
    setStatus("Generating final report");
    const goodbye = early
      ? "Theek hai, interview yahin end kar rahe hain. Main report generate kar rahi hoon."
      : "Bahut dhanyavaad. Aapne interview complete kar liya hai. Main ab final report generate kar rahi hoon.";
    await say(goodbye, { status: "Closing" });

    const fullTranscript = transcriptRef.current;
    const finalReport = await generateFinalReport({
      candidateName,
      transcript: fullTranscript,
      attentionEvents,
      startedAt: startedAtRef.current,
      endedAt: new Date().toISOString(),
      nurseSpecializations: user?.specializations,
    });
    finalReport.requestId = requestId;
    finalReport.nurseId = request?.nurseId?._id || request?.nurseId || user?._id;
    finalReport.patientProblem = request?.problem;
    const saved = saveInterviewReport(finalReport);
    setReport(saved);
    setInterviewActive(false);
    setStatus("Report ready");

    if (!early && answersRef.current.filter(Boolean).length >= TOTAL_QUESTIONS) {
      try {
        await axios.post(`/api/request/${requestId}/interview/submit`, {
          questions: questionsRef.current,
          answers: answersRef.current,
          proctorWarnings: attentionEvents.map(event => ({ message: event.message, at: event.at, type: event.type })),
          report: finalReport,
        });
      } catch (err) {
        setSetupError(err?.response?.data?.error || "Backend interview submit failed. Local report saved.");
      }
    }
    setSubmitting(false);
  }

  function handleSilence() {
    if (!interviewActive || paused || muted || speakingRef.current || awaitingReadyRef.current || report) return;
    say(ATTENTION_MESSAGES.silence(firstName), { status: "Silence prompt" });
  }

  async function handleInterim(text) {
    setInterim(text);
    if (!text || !speakingRef.current || paused || muted || report) return;
    if (!includesAny(text, INTERRUPT_KEYWORDS)) return;
    if (Date.now() - lastInterruptRef.current < 3500) return;
    lastInterruptRef.current = Date.now();
    cancel();
    addTranscript("nurse", text);
    const question = questionsRef.current[currentIndexRef.current] || OPENING_TEXT;
    await say(`Haan ${firstName}, main ruk gayi. ${buildDoubtResponse(question, firstName)}`, { status: "Interrupted for doubt" });
    setInterim("");
  }

  const {
    start: startListening,
    stop: stopListening,
    listening,
    supported: speechSupported,
    error: speechError,
  } = useSpeechRecognition({
    lang: recognitionLang,
    disabled: !interviewActive || paused || muted || Boolean(report),
    onFinal: handleNurseFinal,
    onInterim: handleInterim,
    onSilence: handleSilence,
  });

  useEffect(() => {
    if (!interviewActive || paused || muted || report) return undefined;
    stopListening();
    const timer = window.setTimeout(() => startListening(), 250);
    return () => window.clearTimeout(timer);
  }, [recognitionLang]);

  function togglePause() {
    setPaused(value => {
      const next = !value;
      if (next) {
        stopListening();
        cancel();
        clearQuestionTimer();
        setStatus("Paused");
      } else {
        setStatus("Resumed");
        startListening();
        if (!awaitingReadyRef.current && currentIndexRef.current >= 0 && currentIndexRef.current < TOTAL_QUESTIONS) {
          startQuestionTimer(currentIndexRef.current);
        }
      }
      return next;
    });
  }

  async function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (next) {
      stopListening();
      await say(ATTENTION_MESSAGES.micMuted(firstName), { status: "Mic muted" });
    } else if (interviewActive && !paused) {
      startListening();
    }
  }

  function endEarly() {
    if (!window.confirm("End interview early? Admin report mein incomplete interview dikhega.")) return;
    completeInterview(true);
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-teal-50 text-gray-500">Loading interview room...</div>;
  }

  if (!interviewActive && !report) {
    return (
      <div className="min-h-screen bg-slate-50 text-gray-950">
        <header className="border-b border-gray-100 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <div>
              <p className="font-black text-teal-900">NurseConnect AI Interview Lobby</p>
              <p className="text-xs text-gray-500">{scheduleState.label}</p>
            </div>
            <Link to="/nurse" className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Back to dashboard
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6">
          {(setupError || speechError) && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {setupError || speechError}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-2xl font-black text-gray-950">Camera + Mic Setup</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Namaste {candidateName}. Interview bilkul real room jaisa chalega. Pehle camera aur mic allow kariye; dono working hone ke baad hi interview start hoga.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Camera permission", ok: cameraReady, help: "Aapka face interview ke dauran visible rehna chahiye." },
                  { label: "Microphone permission", ok: micReady, help: "Dr. NIDHI aapke answers sunegi." },
                  { label: "Speech recognition", ok: speechSupported, help: "Chrome/Edge browser me mic se text capture hoga." },
                  { label: "AI voice ready", ok: voiceReady, help: "Agent Hindi/Hinglish mein clearly bolegi." },
                  { label: "Interview window", ok: scheduleState.canStart, help: scheduleState.label },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-black ${item.ok ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"}`}>
                      {item.ok ? "✓" : "!"}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.help}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={startSetup}
                className="mt-6 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-black text-white hover:bg-teal-700"
              >
                {cameraReady && micReady ? "Recheck Camera + Mic" : "Open Camera + Mic"}
              </button>

              <button
                type="button"
                disabled={!canStart}
                onClick={startInterview}
                className="mt-3 w-full rounded-xl bg-gray-950 px-4 py-3 text-sm font-black text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ready to Start Interview
              </button>
            </section>

            <CameraFeed
              ref={videoRef}
              ready={cameraReady}
              micReady={micReady}
              faceState={faceState}
              modelsReady={modelsReady}
              nurseName={candidateName}
              onStartSetup={startSetup}
              setupMode
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-gray-950">
      <header className="shrink-0 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div>
            <p className="font-black text-teal-900">AI Video Interview Room</p>
            <p className="text-xs text-gray-500">{scheduleState.label}</p>
          </div>
          <Link to="/nurse" className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden px-4 py-4">
        <div className="mx-auto grid h-full max-w-7xl gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)]">
          <section className="min-h-0 space-y-4 overflow-y-auto pr-0 xl:pr-1">
          {(setupError || speechError) && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {setupError || speechError}
            </div>
          )}

          <div className="grid min-h-[430px] gap-4 lg:grid-cols-2">
            <AgentAvatar speaking={speaking} status={status} currentQuestion={currentIndex >= 0 ? questions[currentIndex] : OPENING_TEXT} />
            <CameraFeed
              ref={videoRef}
              ready={cameraReady}
              micReady={micReady}
              faceState={faceState}
              modelsReady={modelsReady}
              nurseName={candidateName}
            />
          </div>

          {interviewActive && (
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-950">Interview Progress</p>
                  <p className="text-sm text-gray-500">
                    {awaitingReadyRef.current ? "Waiting for nurse to say ready" : `Question ${Math.max(currentIndex + 1, 1)} of ${TOTAL_QUESTIONS}`}
                  </p>
                </div>
                <div className={`rounded-xl border px-4 py-2 text-right ${questionSecondsLeft <= 30 ? "border-red-200 bg-red-50 text-red-700" : "border-teal-100 bg-teal-50 text-teal-700"}`}>
                  <p className="text-[11px] font-bold uppercase tracking-wide">Question Timer</p>
                  <p className="text-xl font-black tabular-nums">{formatClock(questionSecondsLeft)}</p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 sm:w-64">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.max(5, ((currentIndex + 1) / TOTAL_QUESTIONS) * 100)}%` }} />
                </div>
              </div>
            </section>
          )}

          {report && <InterviewReport report={report} />}
          </section>

          {interviewActive && (
            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
              <div className="shrink-0 border-b border-gray-100 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-950">Live Conversation</p>
                    <p className="text-xs text-gray-500">
                      5 questions. 3 minutes per question. Speak, type, correct, then submit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTranscriptOpen(value => !value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    {transcriptOpen ? "Hide" : "Transcript"}
                  </button>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {LANGUAGE_MODES.map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSpeechMode(mode.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                        speechMode === mode.id
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <div className="mb-3 grid grid-cols-[1fr_auto] items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${listening ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {listening ? "Mic listening" : "Mic reconnecting"}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${voiceDetected ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>
                      {voiceDetected ? "Voice detected" : "Speak closer"}
                    </span>
                  </div>
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${micLevel}%` }} />
                  </div>
                </div>

                <textarea
                  value={answerDraft}
                  onChange={e => updateAnswerDraft(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                  placeholder={awaitingReadyRef.current ? "Bol sakte hain ya type karein: haan / ready / taiyaar" : "Aapka answer yahan aayega. Zarurat ho to edit karke Submit Answer dabayein..."}
                />
                <p className="mt-2 min-h-5 text-xs text-gray-500">
                  {interim ? `Listening: ${interim}` : `Question time left: ${formatClock(questionSecondsLeft)}. Auto-submit ${Math.round(ANSWER_SETTLE_MS / 1000)} sec silence ke baad hoga.`}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!answerDraft.trim() || paused || muted || submitting}
                    onClick={submitTypedInput}
                    className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-black text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {awaitingReadyRef.current ? "Send Ready" : "Submit Answer"}
                  </button>
                  <button
                    type="button"
                    disabled={!interim.trim()}
                    onClick={() => updateAnswerDraft(`${answerDraft ? `${answerDraft} ` : ""}${interim}`.trim())}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Use Detected
                  </button>
                </div>
              </div>

              <div className="shrink-0 border-b border-gray-100 p-4">
                <InterviewControls
                  active={interviewActive}
                  paused={paused}
                  muted={muted}
                  canStart={canStart}
                  listening={listening}
                  volume={volume}
                  onStart={startInterview}
                  onPauseToggle={togglePause}
                  onMuteToggle={toggleMute}
                  onEnd={endEarly}
                  onVolumeChange={setVolume}
                />
              </div>

              {transcriptOpen && (
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Transcript</p>
                  <TranscriptPanel transcript={transcript} interim={interim} />
                </div>
              )}
            </aside>
          )}

          {!interviewActive && report && (
            <section className="min-h-0 overflow-y-auto">
              <InterviewReport report={report} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
