import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  buildDoubtResponse,
  generateAgentReaction,
  generateFinalReport,
  generateInterviewQuestions,
  saveInterviewReport,
} from "../utils/geminiInterview";
import { DOUBT_KEYWORDS, getFirstName, includesAny, READY_KEYWORDS } from "../utils/interviewQuestions";

const OPENING_TEXT = "Namaste! Main hun Dr. NIDHI — NurseConnect ki AI Interview Agent. Aaj main aapka interview lunga NurseConnect ke home nursing program ke liye. Ghabrayein mat — yeh ek friendly conversation hai. Bas naturally baat karein jaise aap kisi se baat karte hain. Interview mein lagbhag 15 minute lagenge. Kya aap taiyaar hain?";

const SMALL_TALK = [
  "Achha, home nursing mein patience aur trust dono bahut important hote hain.",
  "Chalo ab ek practical situation lete hain.",
  "Ab agli baat patient safety se related hai.",
  "Iske baare mein thoda aur real-world angle se sochte hain.",
];

function makeTranscript(role, text) {
  return { id: `${Date.now()}-${Math.random()}`, role, text, at: Date.now() };
}

export default function NurseInterview() {
  const { requestId } = useParams();
  const navigate = useNavigate();
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
  const [report, setReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const candidateName = user?.name || request?.nurseId?.name || "Priya";
  const firstName = getFirstName(candidateName);

  const addTranscript = useCallback((role, text) => {
    if (!text) return;
    const item = makeTranscript(role, text);
    transcriptRef.current = [...transcriptRef.current, item];
    setTranscript(transcriptRef.current);
  }, []);

  const { speak, cancel, speaking, voiceReady } = useSpeechSynthesis({
    volume,
    onStart: () => stopListening(),
    onEnd: () => {
      if (interviewActive && !paused && !muted && !report) startListening();
    },
  });

  const say = useCallback(async (text, options = {}) => {
    addTranscript("agent", text);
    setStatus(options.status || "Dr. NIDHI speaking");
    await speak(text);
  }, [addTranscript, speak]);

  const onAttentionEvent = useCallback((event) => {
    say(event.message, { status: "Attention reminder" });
  }, [say]);

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
    const end = request.interviewSchedule?.endsAt ? new Date(request.interviewSchedule.endsAt).getTime() : start + 30 * 60 * 1000;
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
      streamRef.current?.getTracks()?.forEach(track => track.stop());
      cancel();
    };
  }, [requestId]);

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
    setCurrentIndex(-1);
    currentIndexRef.current = -1;
    answersRef.current = [];
    startedAtRef.current = new Date().toISOString();
    awaitingReadyRef.current = true;
    setStatus("Opening conversation");
    const generated = await generateInterviewQuestions({
      nurseName: candidateName,
      patientProblem: request?.problem,
      patientRequirements: request?.requirements,
      city: request?.city || request?.patientId?.city,
    });
    questionsRef.current = generated;
    setQuestions(generated);
    await say(OPENING_TEXT, { status: "Opening" });
    startListening();
  }

  async function askQuestion(index) {
    const question = questionsRef.current[index];
    if (!question) {
      await completeInterview();
      return;
    }
    currentIndexRef.current = index;
    setCurrentIndex(index);
    const intro = index > 0 && index % 3 === 0 ? `${SMALL_TALK[index % SMALL_TALK.length]} ` : "";
    const text = `${intro}Question ${index + 1}. ${question}`;
    await say(text, { status: `Question ${index + 1} of 10` });
    startListening();
  }

  async function handleNurseFinal(text) {
    if (!text || handlingAnswerRef.current || paused || muted || speaking || report) return;
    setInterim("");

    if (awaitingReadyRef.current) {
      addTranscript("nurse", text);
      if (includesAny(text, READY_KEYWORDS)) {
        awaitingReadyRef.current = false;
        await say(`Bahut achha ${firstName}. Chaliye interview start karte hain. Aap naturally answer dijiye.`, { status: "Starting questions" });
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
      await say(buildDoubtResponse(question), { status: "Clarifying question" });
      return;
    }

    const nextDraft = `${answerDraftRef.current ? `${answerDraftRef.current} ` : ""}${text}`.trim();
    answerDraftRef.current = nextDraft;
    setAnswerDraft(nextDraft);
  }

  async function submitCurrentAnswer() {
    const index = currentIndexRef.current;
    if (awaitingReadyRef.current || index < 0 || handlingAnswerRef.current) return;
    const text = answerDraftRef.current.trim();
    if (!text) {
      await say("Haan, answer dene ke baad Submit Answer press kariye. Main sun rahi hoon.", { status: "Waiting for answer" });
      return;
    }

    addTranscript("nurse", text);
    handlingAnswerRef.current = true;
    const nextAnswers = [...answersRef.current];
    nextAnswers[index] = `${nextAnswers[index] ? `${nextAnswers[index]} ` : ""}${text}`.trim();
    answersRef.current = nextAnswers;
    answerDraftRef.current = "";
    setAnswerDraft("");

    window.setTimeout(async () => {
      const activeIndex = currentIndexRef.current;
      const activeQuestion = questionsRef.current[activeIndex];
      const answer = answersRef.current[activeIndex] || text;
      const reaction = await generateAgentReaction({
        nurseName: candidateName,
        question: activeQuestion,
        answer,
        questionIndex: activeIndex,
      });
      await say(reaction, { status: "Thinking response" });
      handlingAnswerRef.current = false;
      if (activeIndex >= 9) await completeInterview();
      else await askQuestion(activeIndex + 1);
    }, 1500);
  }

  async function completeInterview(early = false) {
    if (submitting) return;
    setSubmitting(true);
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
    });
    finalReport.requestId = requestId;
    finalReport.nurseId = request?.nurseId?._id || request?.nurseId || user?._id;
    finalReport.patientProblem = request?.problem;
    const saved = saveInterviewReport(finalReport);
    setReport(saved);
    setInterviewActive(false);
    setStatus("Report ready");

    if (!early && answersRef.current.filter(Boolean).length >= 5) {
      try {
        await axios.post(`/api/request/${requestId}/interview/submit`, {
          questions: questionsRef.current,
          answers: answersRef.current,
          proctorWarnings: attentionEvents.map(event => ({ message: event.message, at: event.at, type: event.type })),
        });
      } catch (err) {
        setSetupError(err?.response?.data?.error || "Backend interview submit failed. Local report saved.");
      }
    }
    setSubmitting(false);
  }

  function handleSilence() {
    if (!interviewActive || paused || muted || speaking || awaitingReadyRef.current || report) return;
    say("Haan? Kuch kehna chahenge?", { status: "Silence prompt" });
  }

  const {
    start: startListening,
    stop: stopListening,
    listening,
    error: speechError,
  } = useSpeechRecognition({
    disabled: !interviewActive || paused || muted || speaking || Boolean(report),
    onFinal: handleNurseFinal,
    onInterim: setInterim,
    onSilence: handleSilence,
  });

  function togglePause() {
    setPaused(value => {
      const next = !value;
      if (next) {
        stopListening();
        cancel();
        setStatus("Paused");
      } else {
        setStatus("Resumed");
        startListening();
      }
      return next;
    });
  }

  async function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (next) {
      stopListening();
      await say("Aapka mic mute hai. Jab answer dena ho toh mic unmute kar dijiye.", { status: "Mic muted" });
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
    <div className="min-h-screen bg-slate-50 text-gray-950">
      <header className="border-b border-gray-100 bg-white">
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

      <main className="mx-auto max-w-7xl px-4 py-5">
        <div className="space-y-5">
          {(setupError || speechError) && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {setupError || speechError}
            </div>
          )}

          <div className="grid min-h-[520px] gap-5 xl:grid-cols-2">
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
            <section className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-950">Your Answer</p>
                      <p className="text-xs text-gray-500">
                        Bolte rahiye. Jab answer complete ho, Submit Answer press kariye.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTranscriptOpen(value => !value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      {transcriptOpen ? "Hide transcript" : "Show transcript"}
                    </button>
                  </div>
                  <div className="min-h-24 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-900">
                    {answerDraft || interim || (awaitingReadyRef.current ? "Say: haan / ready / taiyaar" : "Aapka spoken answer yahan live dikhega...")}
                  </div>
                </div>
                <div className="w-full lg:w-72">
                  <InterviewControls
                    active={interviewActive}
                    paused={paused}
                    muted={muted}
                    canStart={canStart}
                    listening={listening}
                    volume={volume}
                    answerReady={Boolean(answerDraft.trim()) && !awaitingReadyRef.current}
                    onSubmitAnswer={submitCurrentAnswer}
                    onStart={startInterview}
                    onPauseToggle={togglePause}
                    onMuteToggle={toggleMute}
                    onEnd={endEarly}
                    onVolumeChange={setVolume}
                  />
                </div>
              </div>
            </section>
          )}

          {interviewActive && (
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-950">Interview Progress</p>
                  <p className="text-sm text-gray-500">
                    {awaitingReadyRef.current ? "Waiting for nurse to say ready" : `Question ${Math.max(currentIndex + 1, 1)} of 10`}
                  </p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 sm:w-64">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.max(5, ((currentIndex + 1) / 10) * 100)}%` }} />
                </div>
              </div>
            </section>
          )}

          {report && <InterviewReport report={report} />}
        </div>

        {transcriptOpen && <div className="mt-5"><TranscriptPanel transcript={transcript} interim={interim} /></div>}
      </main>
    </div>
  );
}
