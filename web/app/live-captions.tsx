"use client";

import { useEffect, useRef, useState } from "react";

type Line = { k: string; agent: boolean; text: string; final: boolean };

/** What's being said on a call, as it's said, from Vaani's signed live-captions WebSocket. */
export default function LiveCaptions({ url, who }: { url: string; who: string }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [state, setState] = useState<"connecting" | "live" | "ended">("connecting");
  const box = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    const add = (seg: Record<string, unknown>) =>
      setLines((prev) => {
        const k = String(seg.id ?? seg.segment_index ?? prev.length);
        const line = { k, agent: String(seg.speaker) === "agent", text: String(seg.text ?? ""), final: seg.is_final !== false };
        const i = prev.findIndex((p) => p.k === k);
        return i < 0 ? [...prev, line] : prev.map((p, j) => (j === i ? line : p));
      });
    ws.onopen = () => setState("live");
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.segment) add(msg.segment);
      for (const seg of msg.segments ?? []) add(seg);
      if (msg.type === "call_ended" || msg.type === "stream_ended") setState("ended");
    };
    ws.onclose = () => setState("ended");
    return () => ws.close();
  }, [url]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  return (
    <div className="mt-3 rounded-2xl border border-line bg-paper p-3">
      <p className="label flex items-center gap-2 text-[0.7rem] text-muted">
        <span className={`size-2 rounded-full ${state === "live" ? "on-duty bg-safe" : state === "ended" ? "bg-muted" : "bg-pending"}`} aria-hidden />
        {state === "live" ? "Live transcript" : state === "ended" ? "Call ended" : "Waiting for the call to connect"}
      </p>
      <ol ref={box} aria-live="polite" className="mt-2 max-h-56 space-y-1.5 overflow-y-auto text-sm" data-lenis-prevent>
        {lines.length === 0 && <li className="text-muted">Pick up, and what's said appears here.</li>}
        {lines.map((l) => (
          <li key={l.k} className={`max-w-[85%] rounded-2xl px-3 py-1.5 ${l.agent ? "bg-surface" : "ml-auto bg-ink text-paper"} ${l.final ? "" : "opacity-60"}`}>
            <span className={`label mr-1.5 text-[0.6rem] ${l.agent ? "text-muted" : "text-paper/70"}`}>{l.agent ? "Sorted" : who}</span>
            {l.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
