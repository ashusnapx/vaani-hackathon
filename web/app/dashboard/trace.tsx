"use client";

import Link from "next/link";
import { type Ev, type Row, inr, s } from "./call-detail";

const H = 52; // row height, px
const LANE = 18; // lane spacing, px
const LANE_COLORS = ["#8c6b45", "#2c4f8a", "#3d6b45", "#7a4fa3", "#a8321f"];

const PILL: Record<string, [string, string]> = {
  task: ["new request", "bronze"], intake_call: ["calling customer", "family"], vendor_call: ["calling vendor", "family"],
  callback: ["calling back", "family"], confirm_call: ["confirming", "family"], rating_call: ["asking rating", "family"],
  change_call: ["telling vendor", "family"], report: ["call ended", "ink"], quote: ["quote", "safe"], wave: ["next vendor", "muted"],
  decision: ["decision", "bronze"], counter: ["counter-offer", "bronze"], booked: ["booked", "safe"], locked: ["price locked", "safe"],
  rated: ["rated", "safe"], declined: ["declined", "scam"], cancelled: ["cancelled", "scam"], rescheduled: ["rescheduled", "pending"],
  lock_failed: ["not confirmed", "scam"], intake_incomplete: ["missing details", "scam"], intake_skipped: ["not started", "scam"],
  call: ["vaani event", "muted"], note: ["note", "muted"], vendor_added: ["vendor added", "muted"],
};
const TONE: Record<string, string> = {
  bronze: "border-bronze/40 bg-bronze/10 text-bronze", family: "border-family/30 bg-family/10 text-family",
  ink: "border-ink/25 bg-ink/5 text-ink", safe: "border-safe/30 bg-safe/10 text-safe", scam: "border-scam/30 bg-scam/10 text-scam",
  pending: "border-pending/30 bg-pending/10 text-pending", muted: "border-line-strong bg-surface text-muted",
};
const DOT: Record<string, string> = { bronze: "#8c6b45", family: "#2c4f8a", ink: "#1a1f24", safe: "#3d6b45", scam: "#a8321f", pending: "#8a6a1f", muted: "#9b958b" };

const clock = (at: number) => new Date(at * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}`;

function tone(e: Ev): string {
  if (e.type === "quote") return !Number(e.price) ? "scam" : e.agreed ? "safe" : e.maybe ? "pending" : "scam";
  return PILL[e.type]?.[1] ?? "muted";
}

function tag(e: Ev, row?: Row): string {
  if (e.type === "quote") return !Number(e.price) ? "no deal" : e.agreed ? "fits" : e.maybe ? "could fit" : "over budget";
  if (e.type === "booked") return inr(e.price);
  if (e.type === "decision") return s(e.mode).replace("_", " ");
  if (e.type === "report") {
    const t = Object.values((row?.call_eval_tag ?? e.dispositions ?? {}) as Record<string, unknown>)[0];
    return t ? s(t).toLowerCase().replaceAll("_", " ") : "";
  }
  if (["vendor_call", "callback", "confirm_call", "intake_call"].includes(e.type)) return s(e.status);
  return "";
}

/** A git-graph of everything Sorted does: Sorted's own line, and a branch for each request. */
export default function Trace({ events, rows, text }: { events: Ev[]; rows: Row[]; text: (e: Ev) => string }) {
  const list = [...events].sort((a, b) => a.id - b.id);
  const byCall = new Map(rows.map((r) => [r.call_id, r]));

  // Which request each event belongs to, including Vaani's reports on the calls a request placed.
  const callTask = new Map<string, unknown>();
  for (const e of list) {
    if (e.call_id && e.task_id) callTask.set(String(e.call_id), e.task_id);
    if (e.type === "task" && e.intake_call_id) callTask.set(String(e.intake_call_id), e.task_id);
  }
  const taskOf = (e: Ev) => (e.task_id ?? (e.call_id ? callTask.get(String(e.call_id)) : undefined)) as string | undefined;

  // Each request gets a lane from its first event to its last; lanes are reused once free.
  const span = new Map<string, [number, number]>();
  list.forEach((e, i) => {
    const t = taskOf(e);
    if (!t) return;
    const cur = span.get(t);
    span.set(t, cur ? [cur[0], i] : [i, i]);
  });
  const laneOf = new Map<string, number>();
  const freeAt: number[] = [];
  [...span.entries()].sort((a, b) => a[1][0] - b[1][0]).forEach(([t, [start, end]]) => {
    let lane = freeAt.findIndex((f) => f < start);
    if (lane < 0) lane = freeAt.length;
    freeAt[lane] = end;
    laneOf.set(t, lane + 1);
  });
  const lanes = Math.max(1, ...laneOf.values(), 0) + 1;
  const x = (lane: number) => 14 + lane * LANE;
  const y = (i: number) => i * H + H / 2;
  const width = x(lanes - 1) + 26;

  // When a call ends, label it with how long it lasted.
  const ended = (e: Ev) => (e.type === "report" && e.call_id ? byCall.get(String(e.call_id))?.duration_ms ?? e.duration_ms : undefined);

  if (!list.length) return <p className="mt-4 border-y border-line py-6 text-muted">Nothing yet. A call to +91 80642 79097 starts the trace.</p>;

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-paper/80">
      <div className="grid border-b border-line px-4 py-2 text-xs text-muted" style={{ gridTemplateColumns: `${width}px 6rem 10rem 1fr 7rem` }}>
        <span /> <span>time</span> <span>event</span> <span>summary</span> <span className="text-right">tag</span>
      </div>
      <div className="relative max-h-[38rem] overflow-y-auto" data-lenis-prevent>
        <svg className="pointer-events-none absolute top-0 left-4" width={width} height={list.length * H} aria-hidden>
          <line x1={x(0)} y1={H / 2} x2={x(0)} y2={(list.length - 1) * H + H / 2} stroke="#3d6b45" strokeWidth="2" />
          {[...span.entries()].map(([t, [a, b]]) => {
            const lx = x(laneOf.get(t)!), c = LANE_COLORS[(laneOf.get(t)! - 1) % LANE_COLORS.length];
            const top = y(a), bot = y(b);
            return (
              <path key={t} fill="none" stroke={c} strokeWidth="2"
                d={`M ${x(0)} ${top - H / 2} C ${x(0)} ${top - H / 4}, ${lx} ${top - H / 4}, ${lx} ${top} L ${lx} ${bot} C ${lx} ${bot + H / 4}, ${x(0)} ${bot + H / 4}, ${x(0)} ${bot + H / 2}`} />
            );
          })}
          {list.map((e, i) => {
            const t = taskOf(e);
            return <circle key={e.id} cx={x(t ? laneOf.get(t)! : 0)} cy={y(i)} r={6} fill={DOT[tone(e)]} stroke="#f7f3ec" strokeWidth="2" />;
          })}
        </svg>
        <ol>
          {list.map((e, i) => {
            const t = taskOf(e);
            const row = e.call_id ? byCall.get(String(e.call_id)) : undefined;
            const [pill] = PILL[e.type] ?? [e.type.replaceAll("_", " ")];
            const lasted = ended(e);
            const href = e.call_id ? `/dashboard/call/${encodeURIComponent(String(e.call_id))}`
              : t ? (() => { const c = list.find((x) => taskOf(x) === t && x.call_id); return c ? `/dashboard/call/${encodeURIComponent(String(c.call_id))}` : undefined; })() : undefined;
            const summary = e.type === "report" && row?.call_summary ? String(row.call_summary).split(". ")[0] : text(e);
            const cells = (
              <span className={`relative grid items-center px-4 ${["scam"].includes(tone(e)) && e.type !== "quote" ? "bg-scam/[0.04]" : ""}`}
                style={{ gridTemplateColumns: `${width}px 6rem 10rem 1fr 7rem`, height: H }}>
                <span className="relative">
                  {lasted ? (
                    <span className="absolute -top-3 rounded border border-line bg-paper px-1 text-[0.65rem] text-bronze tabular-nums"
                      style={{ left: x(t ? laneOf.get(t)! : 0) + 10 }}>{mmss(Number(lasted))}</span>
                  ) : null}
                </span>
                <span className="text-sm text-muted tabular-nums">{clock(e.at)}</span>
                <span><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${TONE[tone(e)]}`}>
                  <span className="size-1.5 rounded-full" style={{ background: DOT[tone(e)] }} />{pill}
                </span></span>
                <span className="truncate pr-4 text-sm">{summary}</span>
                <span className="text-right text-xs text-muted">{tag(e, row)}</span>
              </span>
            );
            return (
              <li key={e.id} className="border-b border-line/70 last:border-b-0">
                {href ? <Link href={href} className="block transition hover:bg-surface/70">{cells}</Link> : cells}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
