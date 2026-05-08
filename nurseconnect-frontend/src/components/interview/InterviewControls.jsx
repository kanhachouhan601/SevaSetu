export default function InterviewControls({
  active,
  paused,
  muted,
  canStart,
  listening,
  volume,
  onStart,
  onPauseToggle,
  onMuteToggle,
  onEnd,
  onVolumeChange,
  answerReady,
  onSubmitAnswer,
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {!active ? (
          <button
            type="button"
            disabled={!canStart}
            onClick={onStart}
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ready to Start
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onSubmitAnswer}
              disabled={!answerReady || paused}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit Answer
            </button>
            <button type="button" onClick={onPauseToggle} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {paused ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={onMuteToggle} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${muted ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
              {muted ? "Unmute Mic" : "Mute Mic"}
            </button>
            <button type="button" onClick={onEnd} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50">
              End Interview
            </button>
          </>
        )}
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${listening ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
          Mic {listening ? "always on" : "idle"}
        </span>
      </div>

      <label className="mt-4 flex items-center gap-3 text-xs font-semibold text-gray-600">
        Agent Volume
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={e => onVolumeChange(Number(e.target.value))}
          className="w-40 accent-teal-600"
        />
        {Math.round(volume * 100)}%
      </label>
    </section>
  );
}
