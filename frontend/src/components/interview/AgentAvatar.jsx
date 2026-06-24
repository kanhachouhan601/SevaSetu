export default function AgentAvatar({ speaking, status, currentQuestion, compact = false }) {
  return (
    <section className={`h-full rounded-2xl border border-teal-100 bg-white shadow-sm ${compact ? "p-4" : "p-5"}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-4">
          <div className={`relative flex shrink-0 items-center justify-center ${compact ? "h-16 w-16" : "h-24 w-24"}`}>
            {speaking && <span className="absolute inset-0 rounded-full bg-teal-300/40 animate-ping" />}
            <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 font-black text-white shadow-lg shadow-teal-200 transition-transform ${speaking ? "scale-105" : ""} ${compact ? "h-14 w-14 text-lg" : "h-20 w-20 text-2xl"}`}>
              DN
            </div>
          </div>
          <div className="min-w-0">
            <p className={`${compact ? "text-sm" : "text-base"} font-black text-gray-950`}>Dr. NIDHI</p>
            <p className="text-xs font-semibold text-teal-700">NurseConnect AI Interviewer</p>
            <div className="mt-2 flex items-center gap-2 text-xs font-medium text-gray-600">
              <span className={`h-2 w-2 rounded-full ${speaking ? "bg-red-500" : "bg-emerald-500"}`} />
              {speaking ? "Speaking..." : status}
            </div>
          </div>
        </div>

        <div className="mt-5 flex-1 rounded-xl border border-teal-100 bg-teal-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Current Question</p>
          <p className={`${compact ? "text-sm" : "text-base"} mt-2 leading-relaxed text-gray-950`}>
            {currentQuestion || "Interview start hone ke baad question yahan dikhega."}
          </p>
        </div>
      </div>
    </section>
  );
}
