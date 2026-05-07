import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../api/axios";

const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8" />
  </svg>
);

const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
  </svg>
);

export default function NurseInterview() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [agentStatus, setAgentStatus] = useState("Waiting for scheduled interview window");
  const [proctorWarning, setProctorWarning] = useState("");
  const [proctorWarnings, setProctorWarnings] = useState([]);
  const [voiceReady, setVoiceReady] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const lastFrameRef = useRef(null);
  const voicesRef = useRef([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
      setVoiceReady(voicesRef.current.length > 0);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks()?.forEach(track => track.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!cameraReady) return;
    const timer = setInterval(checkCameraFocus, 1600);
    return () => clearInterval(timer);
  }, [cameraReady]);

  const scheduleState = useMemo(() => {
    const startsAt = request?.interviewSchedule?.startsAt;
    if (!startsAt) return { canStart: false, label: "" };
    const start = new Date(startsAt).getTime();
    const end = request.interviewSchedule?.endsAt
      ? new Date(request.interviewSchedule.endsAt).getTime()
      : start + 30 * 60 * 1000;
    const diff = start - now;
    const canStart = now >= start - 5 * 60 * 1000 && now <= end + 10 * 60 * 1000;
    const label = diff > 0
      ? `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m ${Math.floor((diff % 60000) / 1000)}s remaining`
      : now <= end ? "Interview window is open" : "Interview time has passed";
    return { canStart, label };
  }, [request, now]);

  async function fetchRequest() {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`/api/request/${requestId}/interview`);
      setRequest(data.request);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load interview.");
    } finally {
      setLoading(false);
    }
  }

  async function startInterview() {
    if (!scheduleState.canStart) return;
    if (!cameraReady) {
      setError("Camera on karna zaroori hai. AI ko interview ke dauran nurse visible honi chahiye.");
      return;
    }
    setGenerating(true);
    setError("");
    setAgentStatus("AI is preparing patient-specific questions");
    try {
      const { data } = await axios.post(`/api/request/${requestId}/interview/questions`);
      setQuestions(data.questions || []);
      setAnswers((data.questions || []).map(() => ""));
      setIdx(0);
      setAgentStatus("AI interviewer is asking question 1");
      setTimeout(() => {
        speak("नमस्ते। मैं आपका एआई इंटरव्यूअर हूँ। इंटरव्यू शुरू हो रहा है। कैमरे की तरफ ध्यान रखिए, शांति से सोचिए, और साफ जवाब दीजिए।", { instruction: true });
        setTimeout(() => speak(data.questions?.[0]), 4500);
      }, 250);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not start AI interview.");
      setAgentStatus("AI could not start interview");
    } finally {
      setGenerating(false);
    }
  }

  async function startCamera() {
    setCameraError("");
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 960, height: 540, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraReady(true);
      setAgentStatus("Camera active. AI can monitor interview posture.");
      speak("कैमरा चालू है। आई कॉन्टैक्ट बनाए रखिए, शांत बॉडी लैंग्वेज रखिए, और साफ जवाब दीजिए।", { instruction: true });
    } catch {
      setCameraError("Camera/mic permission allow karke dobara try karein.");
      setCameraReady(false);
    }
  }

  function addProctorWarning(message) {
    setProctorWarning(message);
    setProctorWarnings(list => {
      const last = list[list.length - 1];
      if (last?.message === message && Date.now() - last.at < 8000) return list;
      return [...list, { message, at: Date.now() }].slice(-12);
    });
    speak(message, { warning: true });
  }

  async function checkCameraFocus() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const width = 160;
    const height = 90;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, width, height);
    const frame = ctx.getImageData(0, 0, width, height);

    if (lastFrameRef.current) {
      let diff = 0;
      const previous = lastFrameRef.current.data;
      const current = frame.data;
      for (let i = 0; i < current.length; i += 16) {
        diff += Math.abs(current[i] - previous[i]);
      }
      const motionScore = diff / (current.length / 16);
      if (motionScore > 34) {
        addProctorWarning("इधर-उधर मूवमेंट ज्यादा हो रहा है। कृपया कैमरे के सामने स्थिर बैठिए।");
      }
    }

    lastFrameRef.current = frame;

    if ("FaceDetector" in window) {
      try {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(video);
        if (!faces.length) {
          addProctorWarning("चेहरा कैमरे में साफ दिखाई नहीं दे रहा है। कृपया कैमरे के सामने बैठिए।");
          return;
        }
        const face = faces[0].boundingBox;
        const centerX = face.x + face.width / 2;
        const videoCenter = video.videoWidth / 2;
        if (Math.abs(centerX - videoCenter) > video.videoWidth * 0.22) {
          addProctorWarning("इधर-उधर मत देखिए, कैमरे की तरफ ध्यान रखिए।");
        }
      } catch {
        // FaceDetector is experimental; motion monitoring still runs.
      }
    }
  }

  function updateAnswer(value) {
    setAnswers(list => list.map((answer, i) => i === idx ? value : answer));
  }

  function getBestVoice() {
    const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis?.getVoices?.() || [];
    const preferredNames = [
      "Google हिन्दी",
      "Microsoft Kalpana",
      "Microsoft Hemant",
      "Google UK English Female",
      "Google US English",
      "Microsoft Heera",
      "Microsoft Neerja",
      "Microsoft Aria",
      "Samantha",
    ];
    return preferredNames.map(name => voices.find(voice => voice.name.includes(name))).find(Boolean)
      || voices.find(voice => voice.lang === "hi-IN")
      || voices.find(voice => voice.lang?.startsWith("hi"))
      || voices.find(voice => voice.lang === "en-IN")
      || voices.find(voice => voice.lang?.startsWith("en"))
      || voices[0];
  }

  function makeSpokenText(text, options = {}) {
    if (!text) return "";
    if (options.warning) return text;
    if (options.instruction) return text;
    return `ठीक है, अगला सवाल ध्यान से सुनिए। ${text} आप आराम से सोचकर जवाब दीजिए।`;
  }

  function speak(text, options = {}) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(makeSpokenText(text, options));
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "hi-IN";
    utterance.rate = options.warning ? 0.92 : 0.88;
    utterance.pitch = 1.03;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser. Use Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    let finalTranscript = "";
    setListening(true);
    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }
      const existing = answers[idx]?.trim();
      const spoken = `${finalTranscript} ${interimTranscript}`.trim();
      if (spoken) updateAnswer(`${existing ? `${existing} ` : ""}${spoken}`);
    };
    recognition.onerror = () => {
      setListening(false);
      setError("Mic permission allow karke dobara try karein.");
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  function nextQuestion() {
    if (!answers[idx]?.trim()) {
      setError("Please answer this question first.");
      return;
    }
    setError("");
    const next = idx + 1;
    setIdx(next);
    setAgentStatus(`AI interviewer is asking question ${next + 1}`);
    setTimeout(() => speak(questions[next]), 250);
  }

  async function submitInterview() {
    if (answers.some(answer => !answer.trim())) {
      setError("Please answer all questions before final submit.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      setAgentStatus("AI is scoring the interview");
      const { data } = await axios.post(`/api/request/${requestId}/interview/submit`, { questions, answers, proctorWarnings });
      setResult(data);
      setAgentStatus(data.passed ? "Interview passed" : "Interview not cleared");
      if (data.passed) setTimeout(() => navigate("/nurse"), 2500);
    } catch (err) {
      setError(err?.response?.data?.error || "Interview submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-teal-50 flex items-center justify-center text-gray-500">Loading interview...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-sky-50 text-gray-900">
      <header className="bg-white border-b border-teal-100">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <p className="font-bold text-teal-900">AI Video Interview</p>
            <p className="text-xs text-teal-600">Long-term care request</p>
          </div>
          <Link to="/nurse" className="text-sm text-gray-500 hover:text-teal-700">Back to dashboard</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

        <div className="bg-white border border-teal-100 rounded-2xl p-5">
          <h1 className="font-bold text-xl text-gray-900 mb-2">Patient Requirement</h1>
          <p className="text-sm text-gray-700">{request?.problem}</p>
          <div className="mt-3 text-xs text-gray-500">
            Scheduled: {request?.interviewSchedule?.startsAt ? new Date(request.interviewSchedule.startsAt).toLocaleString("en-IN") : "Not available"}
            <span className="mx-2">·</span>
            {scheduleState.label}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5">
          <div className="bg-white border border-teal-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-gray-900">Camera Proctoring</h2>
                <p className="text-xs text-gray-500">Camera on rehna zaroori hai. Nurse clearly visible honi chahiye.</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${cameraReady ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                {cameraReady ? "Camera Active" : "Camera Required"}
              </span>
            </div>
            <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
              {!cameraReady && <p className="absolute text-sm text-white/80">Camera preview will appear here</p>}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {cameraError && <p className="text-xs text-red-600 mt-2">{cameraError}</p>}
            {proctorWarning && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">{proctorWarning}</p>}
            <button onClick={startCamera} className="mt-3 w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl">
              {cameraReady ? "Restart Camera" : "Turn On Camera"}
            </button>
          </div>

          <div className="bg-white border border-teal-100 rounded-2xl p-5">
            <h2 className="font-bold text-gray-900">AI Agent Status</h2>
              <p className="mt-2 text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">{agentStatus}</p>
              <p className="mt-2 text-xs text-gray-500">
                Voice: {voiceReady ? "natural browser voice selected" : "loading browser voices..."}
              </p>
            <ul className="mt-4 space-y-2 text-xs text-gray-600">
              <li>• Idhar-udhar mat dekho, eye contact maintain karo.</li>
              <li>• Shanti se socho, jaldi-baazi me answer mat do.</li>
              <li>• Question ko dhyaan se suno, samajh ke bolo.</li>
              <li>• Agar nahi aata, confidently bolo "I'm not sure". Guess mat karo.</li>
              <li>• Clear, simple aur straight answer do.</li>
              <li>• Body language calm, confident aur polite rakho.</li>
              <li>• End me thank you bolna mat bhoolna.</li>
            </ul>
          </div>
        </div>

        {!questions.length && !result && (
          <div className="bg-white border border-teal-100 rounded-2xl p-5">
            <p className="text-sm text-gray-600 mb-4">
              Start button scheduled time se 5 minutes pehle enable hoga. AI agent patient-specific questions bolega aur text me bhi dikhayega.
            </p>
            <button
              onClick={startInterview}
              disabled={!scheduleState.canStart || generating || !cameraReady}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {generating ? "Starting AI interview..." : !cameraReady ? "Turn on camera first" : "Start Interview"}
            </button>
          </div>
        )}

        {questions.length > 0 && !result && (
          <div className="bg-white border border-teal-100 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Question {idx + 1} of {questions.length}</p>
              <button onClick={() => speak(questions[idx])} className="inline-flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-lg">
                <SpeakerIcon /> Replay
              </button>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-900">
              {questions[idx]}
            </div>
            <textarea
              rows={6}
              value={answers[idx] || ""}
              onChange={e => updateAnswer(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 resize-none"
              placeholder="Type or speak your answer..."
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={startVoice} disabled={listening} className="flex-1 inline-flex items-center justify-center gap-2 border border-teal-200 bg-teal-50 text-teal-700 font-semibold py-3 rounded-xl">
                <MicIcon /> {listening ? "Listening..." : "Speak Answer"}
              </button>
              {idx < questions.length - 1 ? (
                <button onClick={nextQuestion} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl">Next Question</button>
              ) : (
                <button onClick={submitInterview} disabled={submitting} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
                  {submitting ? "Scoring..." : "Submit Final Interview"}
                </button>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className={`border rounded-2xl p-5 ${result.passed ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            <p className="text-xl font-bold">{result.passed ? "Interview Passed" : "Interview Not Cleared"}</p>
            <p className="mt-2 text-sm">Score: {result.score}/10</p>
            <p className="mt-2 text-sm">{result.criticalFailReason || result.feedback}</p>
          </div>
        )}
      </main>
    </div>
  );
}
