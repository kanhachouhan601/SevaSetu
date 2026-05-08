import { useCallback, useEffect, useRef, useState } from "react";

export default function useSpeechRecognition({
  lang = "hi-IN",
  disabled = false,
  onFinal,
  onInterim,
  onSilence,
  silenceMs = 8000,
} = {}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    disabledRef.current = disabled;
    if (disabled) stop();
  }, [disabled]);

  const resetSilenceTimer = useCallback(() => {
    window.clearTimeout(silenceTimerRef.current);
    if (!onSilence || disabledRef.current) return;
    silenceTimerRef.current = window.setTimeout(() => onSilence(), silenceMs);
  }, [onSilence, silenceMs]);

  const stop = useCallback(() => {
    window.clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice recognition is not supported. Chrome/Edge use karein.");
      return;
    }
    if (disabledRef.current) return;

    recognitionRef.current?.stop?.();
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    setError("");

    recognition.onresult = event => {
      resetSilenceTimer();
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      if (interim.trim()) onInterim?.(interim.trim());
      if (finalText.trim()) {
        onFinal?.(finalText.trim());
        onInterim?.("");
      }
    };

    recognition.onerror = event => {
      setError(event.error === "not-allowed" ? "Mic permission allow karein." : "Mic se text capture nahi ho paaya.");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      window.clearTimeout(silenceTimerRef.current);
      if (!disabledRef.current && recognitionRef.current === recognition) {
        window.setTimeout(() => {
          try {
            recognition.start();
            setListening(true);
            resetSilenceTimer();
          } catch {
            setListening(false);
          }
        }, 350);
      }
    };

    try {
      recognition.start();
      setListening(true);
      resetSilenceTimer();
    } catch {
      setListening(false);
    }
  }, [lang, onFinal, onInterim, resetSilenceTimer]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop, listening, supported, error };
}
