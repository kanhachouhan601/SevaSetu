import { useCallback, useEffect, useRef, useState } from "react";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js/weights";
const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";

function loadFaceApiScript() {
  if (window.faceapi) return Promise.resolve(window.faceapi);
  const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(window.faceapi));
      existing.addEventListener("error", reject);
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.faceapi);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function useFaceDetection({ videoRef, enabled, onAttentionEvent } = {}) {
  const [modelsReady, setModelsReady] = useState(false);
  const [faceState, setFaceState] = useState("idle");
  const [events, setEvents] = useState([]);
  const faceApiRef = useRef(null);
  const noFaceSinceRef = useRef(null);
  const awaySinceRef = useRef(null);
  const lastWarnRef = useRef({});

  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      try {
        const faceapi = await loadFaceApiScript();
        faceApiRef.current = faceapi;
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        if (!cancelled) setModelsReady(true);
      } catch {
        if (!cancelled) setModelsReady(false);
      }
    }
    loadModels();
    return () => { cancelled = true; };
  }, []);

  const addEvent = useCallback((type, message) => {
    const now = Date.now();
    if (lastWarnRef.current[type] && now - lastWarnRef.current[type] < 8500) return;
    lastWarnRef.current[type] = now;
    const event = { type, message, at: now, iso: new Date(now).toISOString() };
    setEvents(list => [...list, event]);
    onAttentionEvent?.(event);
  }, [onAttentionEvent]);

  useEffect(() => {
    if (!enabled || !modelsReady) return undefined;
    const timer = window.setInterval(async () => {
      const video = videoRef?.current;
      if (!video || video.readyState < 2) return;

      try {
        const faceapi = faceApiRef.current;
        if (!faceapi) return;
        const detections = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 })
        );

        const now = Date.now();
        if (detections.length > 1) {
          setFaceState("multiple");
          addEvent("multiple_faces", "Lagta hai koi aur bhi hai. Interview akele dena hota hai.");
          return;
        }

        if (detections.length === 0) {
          setFaceState("no_face");
          if (!noFaceSinceRef.current) noFaceSinceRef.current = now;
          if (now - noFaceSinceRef.current > 6000) {
            addEvent("face_missing", "Main aapko dekh nahi pa raha. Kripya camera ke saamne aayein.");
          }
          return;
        }

        noFaceSinceRef.current = null;
        const box = detections[0].box;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const videoWidth = video.videoWidth || 1;
        const videoHeight = video.videoHeight || 1;
        const away = Math.abs(centerX - videoWidth / 2) > videoWidth * 0.22
          || Math.abs(centerY - videoHeight / 2) > videoHeight * 0.26;

        if (away) {
          setFaceState("looking_away");
          if (!awaySinceRef.current) awaySinceRef.current = now;
          if (now - awaySinceRef.current > 4000) {
            addEvent("looking_away", "Priya, please camera ki taraf dekhein. Interview mein focus zaroori hai.");
          }
        } else {
          awaySinceRef.current = null;
          setFaceState("focused");
        }
      } catch {
        setFaceState("unavailable");
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [addEvent, enabled, modelsReady, videoRef]);

  return { modelsReady, faceState, events };
}
