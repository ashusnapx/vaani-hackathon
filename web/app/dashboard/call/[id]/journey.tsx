"use client";

import { ArrowRightIcon as ArrowRight, CalendarXIcon as CalendarX, ChatCircleDotsIcon as ChatCircleDots, CheckCircleIcon as CheckCircle, HandshakeIcon as Handshake, LockIcon as Lock, PhoneCallIcon as PhoneCall, PhoneIncomingIcon as PhoneIncoming, PhoneOutgoingIcon as PhoneOutgoing, ScalesIcon as Scales, StarIcon as Star } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { type ComponentType, useEffect, useMemo, useState } from "react";
import { type Ev, type Row, Detail, dur, inr, s, when } from "../../call-detail";

type Step = {
  key: string;
  Icon: ComponentType<{ className?: string; weight?: "regular" | "fill" | "duotone" }>;
  title: string;
  caption?: string;
  call?: string;
  state: "done" | "live" | "waiting" | "skipped";
};

const priced = (q?: Record<string, unknown> | null) =>
  !q || !q.price ? "—" : `${inr(q.price)}${q.price_max ? `–${Number(q.price_max).toLocaleString("en-IN")}` : ""}${q.open ? "+" : ""}`;

/** Every step a request takes, rebuilt from Sorted's event log. */
function journey(id: string, events: Ev[], row?: Row, rows: Row[] = [], request?: string) {
  const tagged = request ? undefined : events.find((e) => e.call_id === id && e.task_id);
  const said = (row?.call_entity ?? {}) as Record<string, unknown>;
  const taskId = request ?? tagged?.task_id
    ?? events.find((e) => e.type === "task" && e.intake_call_id === id)?.task_id
    // a customer call from before requests remembered their first call: match who and what
    ?? events.find((e) => e.type === "task" && !e.intake_call_id && said.customer_name && e.name === said.customer_name && e.service === said.service)?.task_id;
  const task = events.find((e) => e.type === "task" && e.task_id === taskId);
  if (!task) return null;
  const mine = events.filter((e) => e.task_id === taskId);
  // The customer's first call: recorded on the request, or else the earliest call from them about this
  // job that isn't one Sorted placed for the request.
  const placed = new Set(mine.map((e) => e.call_id).filter(Boolean));
  const intake = task.intake_call_id ? String(task.intake_call_id)
    : [...rows].reverse().find((r) => {
        const e = (r.call_entity ?? {}) as Record<string, unknown>;
        return !placed.has(r.call_id) && e.customer_name === task.name && e.service === task.service;
      })?.call_id;
  const last = (type: string, vendor?: unknown) =>
    [...mine].reverse().find((e) => e.type === type && (vendor === undefined || e.vendor === vendor));

  const intakeRow = rows.find((r) => r.call_id === intake);
  const fromWebsite = events.some((e) => e.type === "intake_call" && e.call_id === intake)
    || String(intakeRow?.direction ?? intakeRow?.call_type ?? "").toLowerCase().includes("out");
  const steps: Step[] = [{
    key: "intake", Icon: fromWebsite ? PhoneOutgoing : PhoneIncoming,
    title: fromWebsite ? `Sorted called ${s(task.name)}` : `${s(task.name)} called`,
    caption: `${fromWebsite ? "asked from the website · " : ""}${s(task.service)} · budget ${inr(task.budget)}`,
    call: intake, state: "done",
  }];
  const dialled = mine.filter((e) => e.type === "vendor_call").map((e) => String(e.vendor));
  const vendors = [...new Set([...dialled, ...((task.vendors as string[]) ?? [])])];
  for (const v of vendors) {
    const call = last("vendor_call", v);
    const q = last("quote", v);
    steps.push({
      key: `v-${v}`, Icon: PhoneOutgoing, title: v,
      caption: q ? (q.price ? `${priced(q)} · ${q.agreed ? "fits" : q.maybe ? "could fit" : "over budget"}` : s(q.notes)) : call ? "on the phone" : "next in line",
      call: call?.call_id ? String(call.call_id) : undefined,
      state: q ? "done" : call ? "live" : "waiting",
    });
  }
  const counter = last("counter");
  if (counter) steps.push({ key: "counter", Icon: Handshake, title: "Counter-offer", caption: `${inr(counter.offer)} to ${s(counter.vendor)}`, state: "done" });
  const decision = last("decision");
  const best = decision?.best as Record<string, unknown> | undefined;
  steps.push({
    key: "decision", Icon: Scales, title: "Best option",
    caption: best ? `${s(best.vendor)} · ${priced(best)}` : decision ? "nobody available" : "after the quotes",
    state: decision ? "done" : "waiting",
  });
  const callback = last("callback");
  const booked = last("booked");
  steps.push({
    key: "callback", Icon: PhoneCall, title: `Call back ${s(task.name)}`,
    caption: callback ? (booked ? "said yes" : "on the phone") : "with the options",
    call: callback?.call_id ? String(callback.call_id) : undefined,
    state: booked ? "done" : callback ? "live" : "waiting",
  });
  const change = [...mine].reverse().find((e) => e.type === "cancelled" || e.type === "rescheduled");
  if (change) steps.push({ key: "change", Icon: CalendarX, title: change.type === "cancelled" ? "Cancelled" : "Rescheduled", caption: s(change.when), state: "done" });
  steps.push({ key: "booked", Icon: CheckCircle, title: "Booked", caption: booked ? `${s(booked.vendor)} · ${priced(booked)}` : "", state: booked ? "done" : "waiting" });
  const confirm = last("confirm_call");
  const locked = last("locked");
  steps.push({
    key: "locked", Icon: Lock, title: "Price locked", caption: locked ? "on a recorded call" : confirm ? "confirming" : "",
    call: confirm?.call_id ? String(confirm.call_id) : undefined, state: locked ? "done" : confirm ? "live" : "waiting",
  });
  const rated = last("rated");
  steps.push({ key: "rated", Icon: Star, title: "Rated", caption: rated ? `★ ${s(rated.rating)}/5` : "after the job", state: rated ? "done" : "waiting" });

  // Anything after a cancellation is skipped; otherwise the first waiting step is the one under way.
  if (change?.type === "cancelled") for (const st of steps) if (st.state === "waiting") st.state = "skipped";
  const quotes = vendors.map((v) => last("quote", v)).filter((q): q is Ev => !!q && Number(q.price) > 0);
  const status = change?.type === "cancelled" ? "Cancelled" : rated ? "Done" : booked ? "Booked" : decision ? "Calling back" : "Finding people";
  return { task, steps, quotes, status, booked: booked?.vendor ? String(booked.vendor) : "",
    calls: steps.map((st) => st.call).filter((c): c is string => !!c) };
}

function Graph({ steps, current }: { steps: Step[]; current: string }) {
  return (
    <ol className="relative -my-4 flex gap-0 overflow-x-auto px-2 py-7" data-lenis-prevent>
      {steps.map((st, i) => {
        const tone = st.state === "done" ? "bg-ink text-paper border-ink" : st.state === "live" ? "bg-bronze text-paper border-bronze" : "bg-paper text-muted border-line-strong";
        const node = (
          <div className="flex w-36 shrink-0 flex-col items-center text-center sm:w-40">
            <div className="relative flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : steps[i - 1].state === "done" ? "bg-ink" : "border-t-2 border-dashed border-line-strong bg-transparent"}`} />
              <span className={`relative grid size-12 place-items-center rounded-full border-2 ${tone} ${st.call === current ? "ring-4 ring-bronze/30" : ""}`}>
                {st.state === "live" && <span className="absolute inset-0 animate-ping rounded-full bg-bronze/40" aria-hidden />}
                <st.Icon className="relative size-5" weight={st.state === "done" ? "fill" : "regular"} />
              </span>
              <span className={`h-0.5 flex-1 ${i === steps.length - 1 ? "bg-transparent" : st.state === "done" ? "bg-ink" : "border-t-2 border-dashed border-line-strong bg-transparent"}`} />
            </div>
            <p className={`mt-3 text-sm font-semibold ${st.state === "waiting" || st.state === "skipped" ? "text-muted" : ""} ${st.state === "skipped" ? "line-through" : ""}`}>{st.title}</p>
            {st.caption ? <p className="mt-0.5 px-2 text-xs text-muted">{st.caption}</p> : null}
          </div>
        );
        return (
          <li key={st.key}>
            {st.call ? (
              <a href={`#call-${st.call}`} className="block rounded-2xl transition hover:bg-surface/70" title="Jump to this call">
                {node}
              </a>
            ) : node}
          </li>
        );
      })}
    </ol>
  );
}

function PriceChart({ quotes, budget }: { quotes: Ev[]; budget: number }) {
  if (!quotes.length) return null;
  const top = Math.max(budget, ...quotes.flatMap((q) => [Number(q.opening) || 0, Number(q.price_max) || 0, Number(q.price) || 0])) * 1.1;
  const pct = (v: number) => `${Math.min(100, (v / top) * 100)}%`;
  return (
    <section className="rounded-3xl border border-line bg-paper/80 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl">Price, from first word to deal</h2>
        <p className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full bg-line-strong" /> opening</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full bg-bronze" /> final</span>
          <span className="flex items-center gap-1.5"><span className="h-3 border-l-2 border-dashed border-safe" /> budget</span>
        </p>
      </div>
      <ul className="relative mt-6 space-y-5">
        <span className="pointer-events-none absolute -top-2 -bottom-2 border-l-2 border-dashed border-safe" style={{ left: `calc(9rem + (100% - 9rem) * ${budget / top})` }} aria-hidden>
          <span className="absolute -top-5 -translate-x-1/2 text-xs whitespace-nowrap text-safe tabular-nums">{inr(budget)}</span>
        </span>
        {quotes.map((q) => {
          const final = Number(q.price_max) || Number(q.price);
          const opening = Number(q.opening) || 0;
          return (
            <li key={String(q.vendor)} className="grid grid-cols-[9rem_1fr] items-center gap-0">
              <span className="truncate pr-3 text-sm font-semibold">{s(q.vendor)}</span>
              <span className="relative h-8">
                {opening > final && <span className="absolute inset-y-1 left-0 rounded-full bg-line-strong/70" style={{ width: pct(opening) }} title={`opened at ${inr(opening)}`} />}
                <span className={`absolute inset-y-1 left-0 rounded-full ${q.agreed ? "bg-bronze" : "bg-bronze/45"}`} style={{ width: pct(final) }} />
                <span className="absolute inset-y-0 flex items-center pl-2 text-xs font-semibold whitespace-nowrap tabular-nums" style={{ left: pct(Math.max(final, opening)) }}>
                  {priced(q)}{Number(q.saved) > 0 ? <span className="ml-1.5 font-normal text-safe">−{inr(q.saved)}</span> : null}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The first few lines of a call, as said. */
function lines(text: unknown, n = 3) {
  return String(text ?? "")
    .split(/\n+/)
    .map((l) => l.match(/^\s*(?:\[[^\]]+\])?\s*(AGENT|USER)?:?\s*(.*)$/i))
    .filter((m): m is RegExpMatchArray => !!m && !!m[2]?.trim())
    .slice(0, n)
    .map((m) => ({ agent: (m[1] ?? "").toUpperCase() === "AGENT", text: m[2].length > 110 ? `${m[2].slice(0, 110)}…` : m[2] }));
}

type Lane = { key: string; name: string; role: string };

/** Place one call of a request again, e.g. a callback that was declined or unclear. */
function CallAgain({ task, step, who }: { task: string; step: string; who: string }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const t = toast.loading(`Calling ${who} again…`);
    const r = await fetch(`/api/tasks/${encodeURIComponent(task)}/retry?step=${encodeURIComponent(step)}`, { method: "POST" }).catch(() => null);
    const body = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) toast.success(`Sorted is calling ${who}`, { id: t, description: "The new call appears on this page as soon as Vaani lists it." });
    else toast.error("Couldn't place the call", { id: t, description: String(body.detail ?? "Backend unreachable.") });
    setBusy(false);
  }
  return (
    <button onClick={go} disabled={busy} className="pill-dark mt-3 ml-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold disabled:opacity-50">
      <PhoneCall className="size-4" weight="fill" /> {busy ? "Calling…" : `Call ${who} again`}
    </button>
  );
}

/** Who talked to whom, in order: one lifeline per person, one arrow per call. */
function Thread({ steps, rows, task, current, booked }: { steps: Step[]; rows: Row[]; task: Ev; current: string; booked: string }) {
  const [open, setOpen] = useState<string | null>(current);
  const calls = steps.filter((st) => st.call);
  const vendorNames = [...new Set(calls.filter((st) => st.key.startsWith("v-") || st.key === "locked").map((st) => (st.key === "locked" ? "" : st.title)).filter(Boolean))];
  const lanes: Lane[] = [
    { key: "customer", name: s(task.name), role: "Customer" },
    { key: "sorted", name: "Sorted", role: "Vaani agent" },
    ...vendorNames.map((v) => ({ key: `v-${v}`, name: v, role: "Service person" })),
  ];
  const at = (key: string) => lanes.findIndex((l) => l.key === key);
  const center = (i: number) => ((i + 0.5) / lanes.length) * 100;

  return (
    <section className="mt-6 rounded-3xl border border-line bg-paper/80 p-6">
      <h2 className="font-serif text-3xl">Who talked to whom</h2>
      <p className="mt-1 text-sm text-muted">Every call in this request, in order. Open any call for its recording and full transcript.</p>

      <div className="relative mt-8 overflow-x-auto" data-lenis-prevent>
        <div className="relative min-w-[36rem]">
          {/* lifelines */}
          {lanes.map((l, i) => (
            <span key={l.key} className="pointer-events-none absolute top-16 bottom-0 border-l-2 border-dashed border-line-strong" style={{ left: `${center(i)}%` }} aria-hidden />
          ))}
          {/* people */}
          <div className="relative grid" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(0, 1fr))` }}>
            {lanes.map((l) => (
              <div key={l.key} className="flex flex-col items-center text-center">
                {l.key === "sorted" ? (
                  <span className="grid size-12 place-items-center rounded-full border border-line bg-paper"><Image src="/vaani-logo.png" alt="" width={30} height={27} /></span>
                ) : (
                  <span className={`grid size-12 place-items-center rounded-full font-serif text-xl ${l.key === "customer" ? "pill-dark" : "bg-surface-2 text-ink"}`}>{l.name.slice(0, 1)}</span>
                )}
                <p className="mt-1 text-sm font-semibold">{l.name}</p>
                <p className="text-xs text-muted">{l.role}</p>
              </div>
            ))}
          </div>

          {/* calls */}
          <ol className="relative mt-6 space-y-8 pb-2">
            {calls.map((st, n) => {
              const r = rows.find((x) => x.call_id === st.call);
              const person = st.key === "intake" || st.key === "callback" || st.key === "rated" ? "customer" : st.key === "locked" ? `v-${booked}` : st.key;
              const outbound = st.key !== "intake" || String(r?.direction ?? r?.call_type ?? "").toLowerCase().includes("out");
              const from = at(outbound ? "sorted" : person), to = at(outbound ? person : "sorted");
              const left = center(Math.min(from, to)), width = Math.abs(center(to) - center(from));
              const said = lines(r?.call_transcription);
              return (
                <li key={st.key} id={`call-${st.call}`} className="relative scroll-mt-6">
                  {/* the arrow */}
                  <div className="relative h-14">
                    <p className="absolute top-0 text-center text-xs text-muted" style={{ left: `${left}%`, width: `${width}%` }}>
                      <span className="font-semibold text-ink">Call {n + 1}</span> · {st.title}{r ? ` · ${dur(r.duration_ms)}` : ""}
                    </p>
                    <span className={`absolute top-7 h-0.5 ${st.call === current ? "bg-bronze" : "bg-ink"}`} style={{ left: `${left}%`, width: `${width}%` }} aria-hidden />
                    <span className={`absolute top-[1.45rem] size-0 border-y-[6px] border-y-transparent ${to > from ? "border-l-[10px] border-l-ink" : "border-r-[10px] border-r-ink"}`}
                      style={{ left: to > from ? `calc(${center(to)}% - 10px)` : `${center(to)}%` }} aria-hidden />
                    {st.caption ? (
                      <p className="absolute top-9 text-center text-sm font-semibold" style={{ left: `${left}%`, width: `${width}%` }}>{st.caption}</p>
                    ) : null}
                  </div>
                  {/* what was said, then the whole call on demand */}
                  <div className="mx-auto mt-3 max-w-2xl rounded-2xl border border-line bg-paper p-4">
                    {said.length ? (
                      <ol className="space-y-1.5 text-sm">
                        {said.map((l, i) => (
                          <li key={i} className={`max-w-[85%] rounded-2xl px-3 py-1.5 ${l.agent ? "bg-surface" : "ml-auto bg-ink text-paper"}`}>{l.text}</li>
                        ))}
                      </ol>
                    ) : <p className="text-sm text-muted">{r ? "No transcript yet." : "Vaani hasn't listed this call yet."}</p>}
                    {r && (
                      <button onClick={() => setOpen(open === st.call ? null : st.call!)} className="mt-3 text-sm font-semibold underline underline-offset-2 hover:text-bronze">
                        {open === st.call ? "Hide the full call" : "Full call: recording, transcript, data"}
                      </button>
                    )}
                    {st.key === "callback" && <CallAgain task={String(task.task_id)} step="callback" who={s(task.name)} />}
                    {st.key.startsWith("v-") && <CallAgain task={String(task.task_id)} step={`vendor:${st.title}`} who={st.title} />}
                    {st.key === "locked" && booked && <CallAgain task={String(task.task_id)} step="confirm" who={booked} />}
                    {r && open === st.call && <div className="mt-4 border-t border-line pt-4"><Detail r={r} /></div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default function Journey({ id, request }: { id: string; request?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = () => fetch("/api/calls?full=1").then((r) => (r.ok ? r.json() : [])).then(setRows).catch(() => {}).finally(() => setLoaded(true));
    load();
    const t = setInterval(load, 60000); // safety net: the stream says when calls change
    const es = new EventSource("/api/events?full=1");
    es.addEventListener("calls", () => load());
    es.onmessage = (m) => {
      const e: Ev = JSON.parse(m.data);
      setEvents((prev) => (prev.some((p) => p.id === e.id) ? prev : [...prev, e]));
    };
    return () => { clearInterval(t); es.close(); };
  }, []);

  const row = rows.find((r) => r.call_id === id);
  // Land on the call that was opened, once its section exists.
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (landed || !rows.length) return;
    const el = document.getElementById(`call-${id}`);
    if (el) { el.scrollIntoView({ block: "start" }); setLanded(true); }
  });
  const j = useMemo(() => journey(id, events, row, rows, request), [id, events, row, rows, request]);
  const related = j ? rows.filter((r) => j.calls.includes(r.call_id)) : row ? [row] : [];
  const stats = [
    ["Calls", related.length || "—"],
    ["Talk time", related.length ? dur(related.reduce((a, r) => a + Number(r.duration_ms ?? 0), 0)) : "—"],
    ["Cost", related.length ? inr(related.reduce((a, r) => a + Number(r.call_cost ?? 0), 0)) : "—"],
    ["Bargained off", j ? inr(Math.max(0, ...j.quotes.map((q) => Number(q.saved) || 0))) : "—"],
  ] as const;

  return (
    <div className="pb-24">
      <nav className="pt-8 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-ink">Dashboard</Link> <ArrowRight className="inline size-3" /> <span className="tabular-nums">{id}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-serif text-[clamp(2.5rem,5vw,4rem)] leading-none">
            {j ? <>{s(j.task.name)}&rsquo;s <em className="text-bronze">{s(j.task.service)}</em></> : row ? s(row.call_summary).split(".")[0] : "This call"}
          </h1>
          {j && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-muted">
              {j.task.category_label ? <span className="label rounded-full border border-bronze/50 px-2 py-0.5 text-[0.7rem] text-bronze">{s(j.task.category_label)}</span> : null}
              {s(j.task.area)} · {s(j.task.when) === "—" ? "as soon as possible" : s(j.task.when)} · budget {inr(j.task.budget)}
            </p>
          )}
        </div>
        {j && (
          <span className={`stamp text-base ${j.status === "Cancelled" ? "text-scam" : j.status === "Booked" || j.status === "Done" ? "text-safe" : "text-pending"}`}>{j.status}</span>
        )}
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="font-serif text-3xl tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      {j ? (
        <section className="mt-10 rounded-3xl border border-line bg-paper/80 p-6">
          <h2 className="flex items-center gap-2 font-serif text-3xl"><ChatCircleDots className="size-6 text-bronze" weight="duotone" /> The journey</h2>
          <p className="mt-1 text-sm text-muted">Every call in this request. Click a step to open that call.</p>
          <div className="mt-6"><Graph steps={j.steps} current={id} /></div>
        </section>
      ) : loaded && (
        <p className="mt-10 rounded-3xl border border-line bg-surface/50 p-6 text-muted">
          This call isn&rsquo;t part of a request yet. If it&rsquo;s a customer asking for a job, use{" "}
          <span className="font-semibold text-ink">Find service people for this call</span> below to start one.
        </p>
      )}

      {j && j.quotes.length > 0 && <div className="mt-6"><PriceChart quotes={j.quotes} budget={Number(j.task.budget)} /></div>}

      {j ? (
        <Thread steps={j.steps} rows={rows} task={j.task} current={id} booked={j.booked} />
      ) : (
        <section id={`call-${id}`} className="mt-6 rounded-3xl border border-line bg-paper/80 p-6">
          {row ? <Detail r={row} /> : <p className="text-muted">{loaded ? "Vaani hasn't listed this call yet." : "Loading the call…"}</p>}
        </section>
      )}

      {related.length > 1 && (
        <p className="mt-6 text-sm text-muted">
          Calls in this request:{" "}
          {related.map((r, i) => (
            <span key={r.call_id}>
              {r.call_id === id ? <span className="font-semibold text-ink">{r.call_id}</span>
                : <a href={`#call-${r.call_id}`} className="underline underline-offset-2 hover:text-ink">{r.call_id}</a>}
              {i < related.length - 1 ? " · " : ""}
            </span>
          ))}
          {" "}({when(related[0]?.Start_time)})
        </p>
      )}
    </div>
  );
}
