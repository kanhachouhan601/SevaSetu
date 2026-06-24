import { forwardRef } from "react";

const CameraFeed = forwardRef(function CameraFeed({
  ready,
  micReady,
  faceState,
  modelsReady,
  nurseName,
  onStartSetup,
  setupMode = false,
}, videoRef) {
  const faceLabel = {
    idle: "Waiting",
    focused: "Focused",
    looking_away: "Look at camera",
    no_face: "Face missing",
    multiple: "Multiple faces",
    moving: "Sit steady",
    too_far: "Move closer",
    unavailable: "Detection unavailable",
  }[faceState] || "Checking";

  return (
    <section className={`h-full rounded-2xl border border-gray-100 bg-white shadow-sm ${setupMode ? "p-4" : "p-5"}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-gray-950">Nurse Camera</p>
          <p className="text-xs text-gray-500">{nurseName || "Candidate"} ka live interview feed</p>
        </div>
        <div className="flex gap-2 text-[11px] font-semibold">
          <span className={`rounded-full border px-2 py-1 ${ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
            Camera {ready ? "OK" : "Needed"}
          </span>
          <span className={`rounded-full border px-2 py-1 ${micReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
            Mic {micReady ? "OK" : "Needed"}
          </span>
        </div>
      </div>

      <div className={`relative overflow-hidden rounded-xl bg-gray-950 ${setupMode ? "aspect-[4/3]" : "aspect-video"}`}>
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950 text-sm text-white/70">
            Camera preview yahan aayega
          </div>
        )}
        {ready && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording
          </div>
        )}
        <div className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">
          Face: {modelsReady ? faceLabel : "Loading face model"}
        </div>
      </div>

      {onStartSetup && (
        <button
          type="button"
          onClick={onStartSetup}
          className="mt-3 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-700"
        >
          {ready && micReady ? "Restart Camera + Mic Check" : "Allow Camera + Mic"}
        </button>
      )}
    </section>
  );
});

export default CameraFeed;
