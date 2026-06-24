import { useCallback, useEffect, useRef, useState } from "react";

export default function useSpeechRecognition({
  lang = "en-IN",
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
  const restartTimerRef = useRef(null);
  const disabledRef = useRef(disabled);
  const callbacksRef = useRef({ onFinal, onInterim, onSilence });

  useEffect(() => {
    callbacksRef.current = { onFinal, onInterim, onSilence };
  }, [onFinal, onInterim, onSilence]);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    disabledRef.current = disabled;
    if (disabled) stop();
  }, [disabled]);

  const resetSilenceTimer = useCallback(() => {
    window.clearTimeout(silenceTimerRef.current);
    if (!callbacksRef.current.onSilence || disabledRef.current) return;
    silenceTimerRef.current = window.setTimeout(() => callbacksRef.current.onSilence(), silenceMs);
  }, [silenceMs]);

  const stop = useCallback(() => {
    window.clearTimeout(silenceTimerRef.current);
    window.clearTimeout(restartTimerRef.current);
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
      if (interim.trim()) callbacksRef.current.onInterim?.(interim.trim());
      if (finalText.trim()) {
        callbacksRef.current.onFinal?.(finalText.trim());
        callbacksRef.current.onInterim?.("");
      }
    };

    recognition.onerror = event => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Mic permission allow karein. Chrome address bar ke camera/mic icon se permission check karein.");
        recognitionRef.current = null;
        setListening(false);
        return;
      }
      if (event.error === "network") {
        setError("Speech recognition service connect nahi ho paayi. Chrome/Edge aur stable internet use karein.");
      } else if (!["no-speech", "aborted"].includes(event.error)) {
        setError("Mic se awaaz capture nahi ho paayi. Mic input select/permission check karein.");
      }
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
  }, [lang, resetSilenceTimer]);

  useEffect(() => {
    if (disabled || !supported || listening) return undefined;
    restartTimerRef.current = window.setTimeout(() => start(), 700);
    return () => window.clearTimeout(restartTimerRef.current);
  }, [disabled, listening, start, supported]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop, listening, supported, error };
}
