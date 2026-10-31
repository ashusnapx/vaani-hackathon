"use client";

import { ArrowDownLeft, ArrowUpRight, Globe, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Vendors from "./vendors";

type Row = Record<string, unknown> & { call_id: string };
type Ev = { id: number; type: string; at: number } & Record<string, unknown>;
type Agent = Record<string, unknown>;

const s = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
const inr = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const dur = (ms: unknown) => {
  const t = Math.round(Number(ms ?? 0) / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const when = (v: unknown) =>
  v ? new Date(String(v).endsWith("Z") ? String(v) : `${v}Z`).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
const label = (k: string) => k.replaceAll("_", " ");

function direction(r: Row) {
  const d = String(r.direction ?? r.call_type ?? "").toLowerCase();
  if (d.includes("web")) return { Icon: Globe, text: "Web" };
  if (d.includes("in")) return { Icon: ArrowDownLeft, text: "Inbound" };
  return { Icon: ArrowUpRight, text: "Outbound" };
}

function statusTone(st: unknown) {
  const v = String(st ?? "").toLowerCase();
  if (v.includes("complet")) return "text-safe";
  if (v.includes("fail") || v.includes("reject") || v.includes("busy") || v.includes("no")) return "text-scam";
  return "text-pending";
}

function KV({ data }: { data: unknown }) {
  const entries = Object.entries((data ?? {}) as Record<string, unknown>).filter(([, v]) => v !== null && v !== "");
  if (!entries.length) return <p className="text-muted">Nothing recorded.</p>;
  return (
    <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-1.5 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{label(k)}</dt>
          <dd className="break-words">{s(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-5">
      <h3 className="label mb-3 text-xs text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Transcript({ text }: { text: unknown }) {
  const lines = String(text ?? "")
    .split(/\n+/)
    .map((l) => l.match(/^\s*(\[[^\]]+\])?\s*(AGENT|USER|SYSTEM)?:?\s*(.*)$/i))
    .filter((m): m is RegExpMatchArray => !!m && !!m[3]?.trim());
  if (!lines.length) return <p className="text-muted">No transcript yet. It appears after post-processing.</p>;
  return (
    <ol className="max-h-[28rem] space-y-2 overflow-y-auto pr-2 text-[0.95rem]" data-lenis-prevent>
      {lines.map((m, i) => {
        const agent = (m[2] ?? "").toUpperCase() === "AGENT";
        return (
          <li key={i} className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${agent ? "bg-surface" : "ml-auto bg-ink text-paper"}`}>
            <span className={`label mr-2 text-[0.65rem] ${agent ? "text-muted" : "text-paper/70"}`}>
              {agent ? "Sorted" : "Caller"} {m[1]?.replace(/[[\]]/g, "")}
            </span>
            {m[3]}
          </li>
        );
      })}
    </ol>
  );
}

function Detail({ r }: { r: Row }) {
  const { Icon, text } = direction(r);
  const quality = (r.call_conversation_quality ?? {}) as Record<string, number>;
  const billing = (r.billing_breakdown ?? {}) as { line_items?: Record<string, unknown>[] } & Record<string, unknown>;
  const timeline = [
    ["Dialing", r.call_dialing_at], ["Ringing", r.call_ringing_at], ["Picked up", r.user_picked_up_at],
    ["Started", r.Start_time], ["Ended", r.End_time],
  ].filter(([, v]) => v);
  const callback = Object.fromEntries(Object.entries(r).filter(([k, v]) => k.startsWith("callback_") && v && !(Array.isArray(v) && !v.length)));
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-sm">
          <Icon className="size-4" strokeWidth={1.75} aria-hidden /> {text}
        </span>
        <span className={`font-semibold ${statusTone(r.call_status)}`}>{s(r.call_status)}</span>
        <span className="text-sm text-muted">{s(r.sub_status)}</span>
      </div>
      <p className="mt-3 font-serif text-3xl tabular-nums">{s(r.from_number)} → {String(r.to_number ?? "").length > 20 ? "Sorted" : s(r.to_number)}</p>
      <p className="mt-1 text-sm text-muted tabular-nums">{r.call_id} · {dur(r.duration_ms)} · {inr(r.call_cost)}</p>

      <Section title="Recording">
        <audio controls preload="none" src={`/api/recording/${encodeURIComponent(r.call_id)}`} className="h-10 w-full" />
      </Section>

      <Section title="Summary">
        <p className="leading-relaxed">{s(r.call_summary)}</p>
      </Section>

      <Section title="Extracted data">
        <KV data={r.call_entity} />
      </Section>

      <div className="grid gap-x-8 md:grid-cols-2">
        <Section title="Outcome tags">
          <KV data={r.call_eval_tag} />
        </Section>
        <Section title="Conversation quality">
          {Object.keys(quality).length ? (
            <ul className="space-y-2 text-sm">
              {Object.entries(quality).map(([k, v]) => (
                <li key={k}>
                  <div className="flex justify-between"><span className="text-muted">{label(k)}</span><span className="tabular-nums">{v}/10</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-bronze" style={{ width: `${Number(v) * 10}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : <p className="text-muted">Not scored yet.</p>}
        </Section>
      </div>

      <Section title="Timeline">
        <ol className="grid gap-1.5 text-sm">
          {timeline.map(([k, v]) => (
            <li key={String(k)} className="flex justify-between gap-4"><span className="text-muted">{String(k)}</span><span className="tabular-nums">{when(v)}</span></li>
          ))}
          <li className="flex justify-between gap-4"><span className="text-muted">AI leg</span><span className="tabular-nums">{Math.round(Number(r.ai_leg_duration ?? 0))}s</span></li>
          <li className="flex justify-between gap-4"><span className="text-muted">Human leg</span><span className="tabular-nums">{Math.round(Number(r.human_leg_duration ?? 0))}s</span></li>
          <li className="flex justify-between gap-4"><span className="text-muted">Post-processing</span><span>{s(r.post_processing_status)}</span></li>
        </ol>
      </Section>

      <Section title="Billing">
        <p className="mb-3 text-sm">
          <span className="font-serif text-2xl tabular-nums">{inr(r.call_cost)}</span>
          <span className="ml-3 text-muted">{inr(r.rate_per_minute)}/min · {s(r.currency)} · {s(r.billing_status)}{r.billing_finalized ? " · final" : ""}</span>
        </p>
        {billing.line_items?.length ? (
          <table className="w-full text-sm">
            <tbody>
              {billing.line_items.map((li, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5 pr-3">{s(li.description)}</td>
                  <td className="py-1.5 text-right text-muted tabular-nums">
                    {Object.entries(li).filter(([k, v]) => k !== "description" && typeof v === "number").map(([k, v]) => `${label(k)} ${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 4 })}`).join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-muted">No line items yet.</p>}
        {(r.warm_transfer_cost || r.cold_transfer_cost) ? (
          <p className="mt-2 text-sm text-muted">Transfers: warm {inr(r.warm_transfer_cost)} ({s(r.warm_transfer_duration)}s) · cold {inr(r.cold_transfer_cost)} ({s(r.cold_transfer_duration)}s)</p>
        ) : null}
      </Section>

      {Object.keys(callback).length > 0 && <Section title="Callback"><KV data={callback} /></Section>}
      {(r.error_code || r.error_detail) ? <Section title="Error"><p className="text-scam">{s(r.error_code)}: {s(r.error_detail)}</p></Section> : null}

      <Section title="Transcript">
        <Transcript text={r.call_transcription} />
      </Section>

      <Section title="Call metadata">
        <details>
          <summary className="cursor-pointer text-sm text-muted">Show raw metadata</summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-surface p-3 text-xs" data-lenis-prevent>{JSON.stringify(r.call_metadata, null, 2)}</pre>
        </details>
      </Section>
    </div>
  );
}

const EVENT_TEXT: Record<string, (e: Ev) => string> = {
  task: (e) => `${s(e.name)} asked for ${s(e.service)} in ${s(e.area)}, budget ${inr(e.budget)}`,
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
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/calls?full=1").then((r) => (r.ok ? r.json() : [])).then((d: Row[]) => {
      setRows(d);
      setSelected((cur) => cur ?? d[0]?.call_id ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    fetch("/api/agent").then((r) => (r.ok ? r.json() : null)).then(setAgent).catch(() => {});
    const t = setInterval(load, 15000);
    const es = new EventSource("/api/events");
    es.onmessage = (m) => {
      const e: Ev = JSON.parse(m.data);
      setEvents((prev) => (prev.some((p) => p.id === e.id) ? prev : [e, ...prev].slice(0, 80)));
      if (e.type === "report" || e.type === "call") load();
    };
    return () => {
      clearInterval(t);
      es.close();
    };
  }, [load]);

  const shown = rows.filter((r) => filter === "All" || direction(r).text === filter);
  const current = rows.find((r) => r.call_id === selected);

  const stats = useMemo(() => {
    const done = rows.filter((r) => String(r.call_status).toLowerCase().includes("complet"));
    const scores = rows.map((r) => (r.call_conversation_quality as Record<string, number> | null)?.overall_quality).filter((v): v is number => typeof v === "number");
    return [
      ["Calls", rows.length],
      ["Inbound", rows.filter((r) => direction(r).text === "Inbound").length],
      ["Outbound", rows.filter((r) => direction(r).text === "Outbound").length],
      ["Connected", rows.length ? `${Math.round((done.length / rows.length) * 100)}%` : "—"],
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
        <h1 className="font-serif text-5xl">Every call, every detail</h1>
        <button onClick={load} className="flex items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-ink">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.75} aria-hidden /> Refresh
        </button>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-x-6 gap-y-3 border-y border-line py-4 sm:grid-cols-5 lg:grid-cols-9">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="text-lg font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section>
          <div className="flex flex-wrap items-center gap-2">
            {["All", "Inbound", "Outbound", "Web"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
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
                    <button onClick={() => setSelected(r.call_id)} aria-current={r.call_id === selected}
                      className={`grid w-full grid-cols-[1.5rem_1fr_auto] items-start gap-3 px-2 py-3 text-left transition ${r.call_id === selected ? "bg-surface" : "hover:bg-surface/60"}`}>
                      <Icon className="mt-1 size-4 text-bronze" strokeWidth={1.75} aria-label={text} />
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
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-12"><Vendors /></div>

          <h2 className="mt-12 font-serif text-3xl">Live activity</h2>
          <ol className="mt-3 max-h-96 space-y-1.5 overflow-y-auto text-sm" data-lenis-prevent>
            {events.length === 0 && <li className="text-muted">Quiet so far.</li>}
            {events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="w-16 shrink-0 text-muted tabular-nums">{new Date(e.at * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                <span>{(EVENT_TEXT[e.type] ?? ((x: Ev) => label(x.type)))(e)}</span>
              </li>
            ))}
          </ol>

          {agent && (
            <>
              <h2 className="mt-12 font-serif text-3xl">The agent</h2>
              <dl className="mt-3 grid grid-cols-[9rem_1fr] gap-x-4 gap-y-1.5 text-sm">
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
            </>
          )}
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl border border-line bg-paper/80 p-6">
            {current ? <Detail r={current} /> : <p className="text-muted">Select a call to see everything Vaani recorded about it.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
