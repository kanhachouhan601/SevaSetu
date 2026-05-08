export default function AgentAvatar({ speaking, status, currentQuestion }) {
  return (
    <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          {speaking && <span className="absolute inset-0 rounded-full bg-teal-300/40 animate-ping" />}
          <div className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-xl font-black text-white shadow-lg shadow-teal-200 ${speaking ? "scale-105" : ""}`}>
            DN
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-950">Dr. NIDHI - NurseConnect AI Interviewer</p>
          <div className="mt-1 flex items-center gap-2 text-xs font-medium text-teal-700">
            <span className={`h-2 w-2 rounded-full ${speaking ? "bg-red-500" : "bg-emerald-500"}`} />
            {speaking ? "Speaking..." : status}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Current Question</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-900">{currentQuestion || "Interview start hone ke baad question yahan dikhega."}</p>
      </div>
    </section>
  );
}
