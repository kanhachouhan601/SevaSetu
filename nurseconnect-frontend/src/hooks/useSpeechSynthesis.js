import { useCallback, useEffect, useRef, useState } from "react";

export default function useSpeechSynthesis({ volume = 1, onStart, onEnd } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const voicesRef = useRef([]);
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    if (!window.speechSynthesis) return undefined;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
      setVoiceReady(voicesRef.current.length > 0);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const getBestVoice = useCallback(() => {
    const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis?.getVoices?.() || [];
    return voices.find(voice => voice.lang === "hi-IN" && /female|kalpana|heera|neerja|google/i.test(voice.name))
      || voices.find(voice => voice.lang === "hi-IN")
      || voices.find(voice => voice.lang?.startsWith("hi"))
      || voices.find(voice => voice.lang === "en-IN")
      || voices.find(voice => /female|samantha|aria|zira/i.test(voice.name))
      || voices.find(voice => voice.lang?.startsWith("en"))
      || voices[0];
  }, []);

  const speak = useCallback((text, options = {}) => new Promise(resolve => {
    if (!text || !window.speechSynthesis) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "hi-IN";
    utterance.rate = options.rate || 0.85;
    utterance.pitch = options.pitch || 1.1;
    utterance.volume = options.volume ?? volumeRef.current;
    utterance.onstart = () => {
      setSpeaking(true);
      onStart?.();
    };
    utterance.onend = () => {
      setSpeaking(false);
      onEnd?.();
      resolve();
    };
    utterance.onerror = () => {
      setSpeaking(false);
      onEnd?.();
      resolve();
    };
    window.speechSynthesis.speak(utterance);
  }), [getBestVoice, onEnd, onStart]);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    onEnd?.();
  }, [onEnd]);

  return { speak, cancel, speaking, voiceReady };
}
