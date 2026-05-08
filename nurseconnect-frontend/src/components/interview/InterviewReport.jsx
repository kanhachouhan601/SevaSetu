export default function InterviewReport({ report }) {
  if (!report) return null;
  const scores = report.scores || {};
  const scoreItems = Object.entries(scores);

  return (
    <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xl font-black text-gray-950">Interview Report</p>
          <p className="text-sm text-gray-500">{report.candidateName} · {new Date(report.interviewDate || Date.now()).toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-2xl bg-teal-50 px-5 py-3 text-center">
          <p className="text-3xl font-black text-teal-700">{report.overallScore}</p>
          <p className="text-xs font-bold text-teal-700">{report.recommendation}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scoreItems.map(([key, value]) => (
          <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold capitalize text-gray-600">{key.replace(/[A-Z]/g, m => ` ${m}`)}</span>
              <span className="text-sm font-black text-gray-900">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="mb-2 text-sm font-bold text-emerald-800">Strengths</p>
          <ul className="space-y-1 text-sm text-emerald-900">
            {(report.strengths || []).map(item => <li key={item}>- {item}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-bold text-amber-800">Concerns</p>
          <ul className="space-y-1 text-sm text-amber-900">
            {(report.concerns || []).length ? report.concerns.map(item => <li key={item}>- {item}</li>) : <li>No major concerns recorded.</li>}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <p className="mb-1 text-sm font-bold text-gray-900">Admin Notes</p>
        <p className="text-sm leading-relaxed text-gray-700">{report.adminNotes}</p>
      </div>
    </section>
  );
}
