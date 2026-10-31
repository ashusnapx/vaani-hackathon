"use client";

import { ArrowClockwiseIcon as ArrowClockwise } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import Trace from "./trace";
import { type Agent, type Ev, type Row, direction, dur, inr, label, s, statusTone, when } from "./call-detail";

/** One row per request: who, what, where it stands, and the best price so far. Opens its journey. */
function Requests({ events }: { events: Ev[] }) {
  const tasks = events.filter((e) => e.type === "task");
  const [busy, setBusy] = useState(false);
  const rehearse = async (k: string) => {
    setBusy(true);
    await fetch(`/api/demo/${k}`, { method: "POST" }).catch(() => {});
    setBusy(false);
  };
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl">Requests</h2>
        <p className="text-xs text-muted">
          Rehearse:{" "}
          <button onClick={() => rehearse("agreed")} disabled={busy} className="underline underline-offset-2 hover:text-ink">both agree</button>
          {" · "}
          <button onClick={() => rehearse("none")} disabled={busy} className="underline underline-offset-2 hover:text-ink">nobody fits</button>
        </p>
      </div>
      {tasks.length === 0 ? (
        <p className="mt-4 border-y border-line py-6 text-muted">No requests yet. A customer call, or “Call me” on the home page, starts one.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {tasks.map((t) => {
            const mine = events.filter((e) => e.task_id === t.task_id);
            const has = (type: string) => mine.find((e) => e.type === type);
            const booked = has("booked");
            const best = (has("decision")?.best ?? null) as Record<string, unknown> | null;
            const quotes = mine.filter((e) => e.type === "quote").length;
            const status = has("cancelled") ? "Cancelled" : booked ? "Booked" : has("decision") ? "Calling back" : `Ringing · ${quotes} quote${quotes === 1 ? "" : "s"}`;
            const row = (
              <span className="grid grid-cols-[1fr_auto] items-center gap-4 px-2 py-3">
                <span className="min-w-0">
                  <span className="font-semibold">{s(t.name)}</span>
                  <span className="text-muted"> · {s(t.service)} · {s(t.area)}</span>
                </span>
                <span className="flex items-center gap-3 text-sm">
                  <span className="tabular-nums">{booked ? inr(booked.price) : best ? inr(best.price) : inr(t.budget)}</span>
                  <span className={`label text-[0.65rem] ${booked ? "text-safe" : has("cancelled") ? "text-scam" : "text-pending"}`}>{status}</span>
                </span>
              </span>
            );
            return (
              <li key={t.id}>
                {t.intake_call_id ? (
                  <Link href={`/dashboard/call/${encodeURIComponent(String(t.intake_call_id))}`} className="block rounded-xl transition hover:bg-surface/70">{row}</Link>
                ) : row}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const EVENT_TEXT: Record<string, (e: Ev) => string> = {
  task: (e) => `${s(e.name)} asked for ${s(e.service)} (${s(e.category_label)}) in ${s(e.area)}, budget ${inr(e.budget)}; ringing ${(e.vendors as string[])?.length ?? 0}`,
  vendor_call: (e) => `Calling ${s(e.vendor)} (${s(e.status)})`,
  quote: (e) => !e.price ? `${s(e.vendor)}: ${s(e.notes)}`
    : `${s(e.vendor)} quoted ${inr(e.price)}${e.price_max ? `–${Number(e.price_max).toLocaleString("en-IN")}` : ""}${e.open ? "+" : ""} (${s(e.basis)}), ${e.agreed ? "fits budget" : e.maybe ? "could fit" : "over budget"}`,
  wave: (e) => s(e.note),
  decision: (e) => `Decision: ${s(e.mode)}${e.best ? `, best ${s((e.best as Record<string, unknown>).vendor)}` : ""}`,
  callback: (e) => `Calling ${s(e.to)} back (${s(e.status)})`,
  booked: (e) => `Booked ${s(e.vendor)} at ${inr(e.price)}, ${s(e.eta)}`,
  confirm_call: (e) => `Confirming with ${s(e.vendor)} (${s(e.status)})`,
  intake_call: (e) => `Web request: calling ${s(e.to)}`,
  vendor_added: (e) => `Added service person ${s(e.vendor)}`,
  counter: (e) => `Customer countered at ${inr(e.offer)}; asking ${s(e.vendor)}`,
  locked: (e) => `Price locked with ${s(e.vendor)} at ${inr(e.price)} (recorded)`,
  lock_failed: (e) => `${s(e.vendor)} did not confirm the price`,
  note: (e) => s(e.text),
  rated: (e) => `${s(e.vendor)} rated ${s(e.rating)}/5 (now ${s(e.average)})${e.comment ? `: "${s(e.comment)}"` : ""}`,
  cancelled: () => "Customer cancelled by phone",
  rescheduled: (e) => `Customer moved the job to ${s(e.when)}`,
  change_unmatched: (e) => `A ${s(e.intent)} call didn't match any request`,
  intake_incomplete: (e) => `Request from ${s(e.name)} missing ${s((e.missing as string[])?.join(", "))}`,
  intake_skipped: (e) => `Request not started: ${s(e.reason)}`,
  declined: () => "Customer didn't pick an option",
  call: (e) => `Vaani: ${label(s(e.event))}`,
  report: (e) => `Report ready for ${s(e.call_id)}`,
};

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/calls?full=1").then((r) => (r.ok ? r.json() : [])).then((d: Row[]) => {
      setRows(d);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // The filter lives in the URL, so a refresh keeps it.
  useEffect(() => {
    const dir = new URLSearchParams(window.location.search).get("dir");
    if (dir) setFilter(dir);
  }, []);
  const pick = (dir: string) => {
    setFilter(dir);
    window.history.replaceState(null, "", dir === "All" ? window.location.pathname : `?dir=${dir}`);
  };

  useEffect(() => {
    load();
    fetch("/api/agent").then((r) => (r.ok ? r.json() : null)).then(setAgent).catch(() => {});
    const t = setInterval(load, 15000);
    const es = new EventSource("/api/events?full=1");
    es.onmessage = (m) => {
      const e: Ev = JSON.parse(m.data);
      setEvents((prev) => (prev.some((p) => p.id === e.id) ? prev : [e, ...prev]));
      if (e.type === "report" || e.type === "call") load();
    };
    return () => {
      clearInterval(t);
      es.close();
    };
  }, [load]);

  const shown = rows.filter((r) => filter === "All" || direction(r).text === filter);

  const stats = useMemo(() => {
    const scores = rows.map((r) => (r.call_conversation_quality as Record<string, number> | null)?.overall_quality).filter((v): v is number => typeof v === "number");
    return [
      ["Calls", rows.length],
      ["Talk time", dur(rows.reduce((a, r) => a + Number(r.duration_ms ?? 0), 0))],
      ["Spend", inr(rows.reduce((a, r) => a + Number(r.call_cost ?? 0), 0))],
      ["Avg quality", scores.length ? `${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}/10` : "—"],
      ["Requests", events.filter((e) => e.type === "task").length],
      ["Booked", events.filter((e) => e.type === "booked").length],
    ] as const;
  }, [rows, events]);

  return (
    <div className="pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-10">
        <h1 className="font-serif text-5xl">Dashboard</h1>
        <button onClick={load} className="flex items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-ink">
          <ArrowClockwise className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden /> Refresh
        </button>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-x-6 gap-y-4 border-y border-line py-5 lg:grid-cols-6">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="font-serif text-3xl tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <Requests events={events} />

      <h2 className="mt-12 font-serif text-3xl">Live trace</h2>
      <p className="mt-1 text-sm text-muted">Sorted&rsquo;s line, and a branch for every request: each call, quote and decision in the order it happened.</p>
      <Trace events={events} rows={rows} text={(e) => (EVENT_TEXT[e.type] ?? ((x: Ev) => label(x.type)))(e)} />

      <h2 className="mt-12 font-serif text-3xl">Calls</h2>
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section>
          <div className="flex flex-wrap items-center gap-2">
            {["All", "Inbound", "Outbound", "Web"].map((f) => (
              <button key={f} onClick={() => pick(f)} aria-pressed={filter === f}
                className={`rounded-full border px-3 py-1 text-sm ${filter === f ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink"}`}>
                {f}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="mt-6 text-muted">No calls yet. Ring +91 80642 79097 or use “Call me” on the home page.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {shown.map((r) => {
                const { Icon, text } = direction(r);
                const tag = Object.values((r.call_eval_tag ?? {}) as Record<string, unknown>)[0];
                return (
                  <li key={r.call_id}>
                    <Link href={`/dashboard/call/${encodeURIComponent(r.call_id)}`}
                      className="group grid w-full grid-cols-[1.5rem_1fr_auto] items-start gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-surface/70">
                      <Icon className="mt-1 size-4 text-bronze" aria-label={text} />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-baseline gap-x-3">
                          <span className="font-semibold tabular-nums">{s(r.from_number).slice(0, 18)}</span>
                          <span className={`text-sm ${statusTone(r.call_status)}`}>{s(r.call_status)}</span>
                          {tag ? <span className="label text-[0.65rem] text-bronze">{s(tag)}</span> : null}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted">{s(r.call_summary)}</span>
                      </span>
                      <span className="text-right text-sm tabular-nums">
                        {dur(r.duration_ms)}
                        <span className="block text-xs text-muted">{when(r.Start_time)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <p className="text-sm">
            <Link href="/service-people" className="underline underline-offset-2 hover:text-bronze">Manage service people →</Link>
          </p>


          {agent && (
            <>
              <details className="mt-10 rounded-2xl border border-line bg-paper/70 p-4">
              <summary className="font-semibold">Agent settings</summary>
              <dl className="mt-4 grid grid-cols-[9rem_1fr] gap-x-4 gap-y-1.5 text-sm">
                {[
                  ["Number", agent.number], ["Language", `${s(agent.language)}${agent.auto_detect ? ", auto-detect" : ""}`],
                  ["Brain (LLM)", agent.llm && `${s((agent.llm as Agent).provider)} · ${s((agent.llm as Agent).model)}`],
                  ["LLM fallback", agent.llm_fallback && `${s((agent.llm_fallback as Agent).provider)} · ${s((agent.llm_fallback as Agent).model)}`],
                  ["Ears (STT)", agent.stt && `${s((agent.stt as Agent).provider)} · ${s((agent.stt as Agent).model)}`],
                  ["STT fallback", agent.stt_fallback && `${s((agent.stt_fallback as Agent).provider)} · ${s((agent.stt_fallback as Agent).model)}`],
                  ["Voice (TTS)", agent.tts && `${s((agent.tts as Agent).provider)} · ${s((agent.tts as Agent).model)} · ${s((agent.tts as Agent).voice_name)}`],
                  ["TTS fallback", agent.tts_fallback && `${s((agent.tts_fallback as Agent).provider)} · ${s((agent.tts_fallback as Agent).voice_name)}`],
                  ["Greeting", agent.greeting], ["Memory", agent.memory ? "Remembers last 5 calls" : "Off"],
                  ["Voicemail detection", agent.voicemail_detection ? "On" : "Off"], ["Max call", `${s(agent.max_call_minutes)} min`],
                  ["Tools", (agent.tools as string[])?.join(", ") || "Set in Vaani dashboard"],
                  ["Vendors on file", (agent.vendors as string[])?.join(", ") || "None yet"],
                  ["Last edited", when(agent.last_edited_at)],
                ].map(([k, v]) => (
                  <div key={String(k)} className="contents">
                    <dt className="text-muted">{String(k)}</dt>
                    <dd className="break-words">{s(v)}</dd>
                  </div>
                ))}
              </dl>
              </details>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
