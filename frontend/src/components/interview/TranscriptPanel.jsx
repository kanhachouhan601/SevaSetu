import { useEffect, useRef } from "react";

export default function TranscriptPanel({ transcript, interim }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interim]);

  return (
    <aside className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold text-gray-950">Live Transcript</p>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500">{transcript.length} entries</span>
      </div>
      <div className="h-[520px] space-y-3 overflow-y-auto pr-1">
        {transcript.map(item => (
          <div key={item.id} className={`rounded-xl border px-3 py-2 ${item.role === "agent" ? "border-sky-100 bg-sky-50" : "border-emerald-100 bg-emerald-50"}`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className={`text-xs font-bold ${item.role === "agent" ? "text-sky-700" : "text-emerald-700"}`}>
                {item.role === "agent" ? "Dr. NIDHI" : "Nurse"}
              </span>
              <span className="text-[10px] text-gray-400">{new Date(item.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-800">{item.text}</p>
          </div>
        ))}
        {interim && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm italic text-emerald-700">
            {interim}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </aside>
  );
}
