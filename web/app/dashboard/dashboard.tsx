"use client";

import { ArrowClockwiseIcon as ArrowClockwise } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { type Agent, type Ev, type Row, direction, dur, inr, label, s, statusTone, when } from "./call-detail";

/** The calls that make up one request, in order: the customer's, each vendor's, the callback, and so on. */
export function requestCalls(t: Ev, events: Ev[], rows: Row[]) {
  const mine = events.filter((e) => e.task_id === t.task_id && e.call_id).sort((a, b) => a.id - b.id);
  const placed = new Set(mine.map((e) => String(e.call_id)));
  const intake = t.intake_call_id ? String(t.intake_call_id) : [...rows].reverse().find((r) => {
    const e = (r.call_entity ?? {}) as Record<string, unknown>;
    return !placed.has(r.call_id) && e.customer_name === t.name && e.service === t.service;
  })?.call_id;
  const role: Record<string, (e: Ev) => string> = {
    vendor_call: (e) => `Sorted → ${s(e.vendor)}`, callback: () => `Sorted → ${s(t.name)}, with the options`,
    confirm_call: (e) => `Sorted → ${s(e.vendor)}, to confirm`, rating_call: () => `Sorted → ${s(t.name)}, for a rating`,
    change_call: (e) => `Sorted → ${s(e.vendor)}, about a change`,
  };
  // A website request ("Call me") means Sorted rang them; otherwise they rang Sorted.
  const intakeRow = intake ? rows.find((r) => r.call_id === intake) : undefined;
  const fromWebsite = events.some((e) => e.type === "intake_call" && e.call_id === intake)
    || String(intakeRow?.direction ?? intakeRow?.call_type ?? "").toLowerCase().includes("out");
  const list = [
    ...(intake ? [{ id: intake, who: fromWebsite ? `Sorted → ${s(t.name)}, who asked from the website` : `${s(t.name)} → Sorted, with the request` }] : []),
    ...mine.filter((e) => role[e.type]).map((e) => ({ id: String(e.call_id), who: role[e.type](e) })),
  ];
  return list.map((c) => ({ ...c, row: rows.find((r) => r.call_id === c.id) }));
}

/** Each request as one card, with its calls grouped underneath. */
function Requests({ events, rows }: { events: Ev[]; rows: Row[] }) {
  const tasks = events.filter((e) => e.type === "task").sort((a, b) => b.id - a.id);
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
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {tasks.map((t) => {
            const mine = events.filter((e) => e.task_id === t.task_id);
            const has = (type: string) => [...mine].reverse().find((e) => e.type === type);
            const booked = has("booked");
            const best = (has("decision")?.best ?? null) as Record<string, unknown> | null;
            const status = has("cancelled") ? ["Cancelled", "text-scam"] : booked ? ["Booked", "text-safe"]
              : has("declined") ? ["Declined", "text-scam"] : has("decision") ? ["Calling back", "text-pending"] : ["Finding people", "text-pending"];
            const calls = requestCalls(t, events, rows);
            return (
              <article key={t.id} className="rounded-3xl border border-line bg-paper/80 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-serif text-2xl leading-tight">{s(t.name)} · {s(t.service)}</p>
                    <p className="mt-1 text-sm text-muted">
                      {t.category_label ? `${s(t.category_label)} · ` : ""}{s(t.area)} · budget {inr(t.budget)}
                      {booked ? ` · booked at ${inr(booked.price)}` : best ? ` · best ${inr(best.price)}` : ""}
                    </p>
                  </div>
                  <span className={`stamp shrink-0 text-xs ${status[1]}`}>{status[0]}</span>
                </div>
                <ol className="mt-4 space-y-1 border-l-2 border-line pl-4">
                  {calls.length === 0 && <li className="text-sm text-muted">No calls yet.</li>}
                  {calls.map((c, i) => (
                    <li key={c.id} className="relative">
                      <span className="absolute top-2.5 -left-[1.3rem] size-2.5 rounded-full border-2 border-paper bg-ink" aria-hidden />
                      <Link href={`/dashboard/request/${encodeURIComponent(String(t.task_id))}#call-${c.id}`} className="block rounded-xl px-2 py-1.5 transition hover:bg-surface/70">
                        <span className="text-sm"><span className="text-muted">Call {i + 1}</span> · <span className="font-semibold">{c.who}</span>
                          {c.row ? <span className="text-muted tabular-nums"> · {dur(c.row.duration_ms)}</span> : null}</span>
                        {c.row?.call_summary ? <span className="mt-0.5 block truncate text-xs text-muted">{String(c.row.call_summary).split(". ")[0]}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ol>
                <Link href={`/dashboard/request/${encodeURIComponent(String(t.task_id))}`}
                  className="pill-dark mt-4 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold">Open request</Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

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
    const t = setInterval(load, 60000); // safety net: the stream says when calls change
    const es = new EventSource("/api/events?full=1");
    es.addEventListener("calls", () => load());
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

  const grouped = new Set(events.filter((e) => e.type === "task").flatMap((t) => requestCalls(t, events, rows).map((c) => c.id)));
  const shown = rows.filter((r) => !grouped.has(r.call_id) && (filter === "All" || direction(r).text === filter));

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

      <Requests events={events} rows={rows} />


      <h2 className="mt-12 font-serif text-3xl">Other calls</h2>
      <p className="mt-1 text-sm text-muted">Calls that aren&rsquo;t part of a request: tests, status checks, anything that didn&rsquo;t start a search.</p>
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
