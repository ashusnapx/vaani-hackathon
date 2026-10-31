"use client";

import { animate } from "animejs";
import { useCallback, useEffect, useRef, useState } from "react";

type Ev = { id: number; type: string; at: number } & Record<string, unknown>;
type Call = Record<string, unknown> & { call_id: string };
type Offer = { vendor: string; price: number; eta: string; notes?: string } | null;

const s = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const inr = (v: unknown) => `₹${Number(v).toLocaleString("en-IN")}`;
const clock = (at: number) => new Date(at * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const reduced = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function useStamp(on: unknown) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!on || !ref.current || reduced()) return;
    animate(ref.current, { scale: [1.9, 1], opacity: [0, 1], rotate: ["-16deg", "-4deg"], duration: 420, ease: "outQuart" });
  }, [on]);
  return ref;
}

function Stamp({ label, tone, on = true }: { label: string; tone: string; on?: unknown }) {
  const ref = useStamp(on);
  return <span ref={ref} className={`stamp text-sm ${tone}`}>{label}</span>;
}

function Captions({ url, who }: { url: string; who: string }) {
  const [lines, setLines] = useState<{ k: string; speaker: string; text: string }[]>([]);
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    const ws = new WebSocket(url);
    const add = (seg: Record<string, unknown>) =>
      setLines((prev) => {
        const k = String(seg.id ?? seg.segment_index ?? prev.length);
        const line = { k, speaker: String(seg.speaker ?? ""), text: String(seg.text ?? "") };
        const i = prev.findIndex((p) => p.k === k);
        return i < 0 ? [...prev, line].slice(-6) : prev.map((p, j) => (j === i ? line : p));
      });
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.segment) add(msg.segment);
      for (const seg of msg.segments ?? msg.history ?? []) add(seg);
      if (["call_ended", "stream_ended"].includes(msg.type)) setEnded(true);
    };
    ws.onclose = () => setEnded(true);
    return () => ws.close();
  }, [url]);
  return (
    <div className="mt-3 space-y-1 text-[0.95rem] leading-snug">
      {lines.length === 0 && !ended && <p className="text-muted">Ringing…</p>}
      {lines.map((l) => (
        <p key={l.k}>
          <span className="label mr-2 text-[0.7rem] text-muted">{l.speaker === "agent" ? "Sorted" : who}</span>
          {l.text}
        </p>
      ))}
      {ended && <p className="label text-[0.7rem] text-muted">Call ended</p>}
    </div>
  );
}

function Lane({ name, call, quote, booked, rank }: { name: string; call?: Ev; quote?: Ev; booked: boolean; rank?: string }) {
  const priceRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (quote && priceRef.current && !reduced())
      animate(priceRef.current, { scale: [1.2, 1], opacity: [0, 1], duration: 450, ease: "outBack(1.6)" });
  }, [quote]);
  const price = quote ? Number(quote.price) : 0;
  return (
    <div className={`rounded-2xl border bg-paper/70 p-5 ${booked ? "border-safe" : "border-line"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-2xl">{name}</p>
        <span className="label text-[0.7rem] text-muted">{quote ? "answered" : call ? s(call.status) : "queued"}</span>
      </div>
      <div className="mt-3 flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2">
        {quote ? (
          price ? (
            <>
              <p ref={priceRef} className="font-serif text-5xl tabular-nums">{inr(price)}</p>
              <div className="text-sm">
                <p>{s(quote.eta)}</p>
                {quote.notes ? <p className="text-muted">{s(quote.notes)}</p> : null}
              </div>
            </>
          ) : (
            <p className="text-muted">No deal: {s(quote.notes)}</p>
          )
        ) : (
          <p className="text-muted">Waiting for a price</p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {quote && price ? (
          quote.agreed ? <Stamp label="Agreed" tone="text-safe" on={quote} /> : <Stamp label="Over budget" tone="text-pending" on={quote} />
        ) : null}
        {rank && <Stamp label={rank} tone="text-family" on={rank} />}
        {booked && <Stamp label="Booked" tone="text-safe" on={booked} />}
      </div>
      {call?.live_captions_url ? <Captions url={String(call.live_captions_url)} who={name} /> : null}
    </div>
  );
}

function Request({ task, events }: { task: Ev; events: Ev[] }) {
  const mine = events.filter((e) => e.task_id === task.task_id);
  const last = (type: string, vendor?: string) =>
    mine.find((e) => e.type === type && (vendor === undefined || e.vendor === vendor));
  const vendors = [...new Set([...(task.vendors as string[]), ...mine.filter((e) => e.vendor).map((e) => String(e.vendor))])];
  const decision = last("decision");
  const best = decision?.best as Offer;
  const backup = decision?.backup as Offer;
  const callback = last("callback");
  const booked = last("booked");
  const confirm = last("confirm_call");
  const dialed = new Set(mine.filter((e) => e.type === "vendor_call" || e.type === "quote").map((e) => String(e.vendor)));
  const shown = vendors.filter((v) => dialed.has(v)).length ? vendors.filter((v) => dialed.has(v)) : vendors.slice(0, 2);

  return (
    <article className="py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted tabular-nums">{clock(task.at)} · {s(task.name)} called</p>
          <h3 className="mt-1 font-serif text-4xl">{s(task.service)}</h3>
          <p className="mt-1 text-lg">
            {s(task.details)} · {s(task.area)} · {s(task.when)}
          </p>
        </div>
        <div className="text-right">
          <p className="label text-[0.7rem] text-muted">Budget</p>
          <p className="font-serif text-4xl tabular-nums">{inr(task.budget)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {shown.map((v) => (
          <Lane
            key={v}
            name={v}
            call={last("vendor_call", v)}
            quote={last("quote", v)}
            booked={booked?.vendor === v}
            rank={best?.vendor === v ? (decision?.mode === "agreed" ? "Best" : "Closest") : backup?.vendor === v ? "Backup" : undefined}
          />
        ))}
      </div>
      {mine.filter((e) => e.type === "wave").map((w) => (
        <p key={w.id} className="mt-3 text-sm text-muted">{s(w.note)}</p>
      ))}

      {decision && (
        <div className="mt-6 rounded-2xl border border-line bg-surface/70 p-5">
          <p className="font-semibold">
            {booked
              ? `Booked with ${s(booked.vendor)} for ${inr(booked.price)}, ${s(booked.eta)}.`
              : decision.mode === "agreed"
                ? `${best?.vendor} agreed at ${inr(best?.price)}${backup ? `; ${backup.vendor} is the backup at ${inr(backup.price)}` : ""}. Calling ${s(task.name)} back.`
                : decision.mode === "over_budget"
                  ? `Nobody met ${inr(task.budget)}. Closest: ${best?.vendor} at ${inr(best?.price)}. Asking ${s(task.name)}.`
                  : `No one could take it. Calling ${s(task.name)} back with the news.`}
          </p>
          {callback?.live_captions_url && !booked ? <Captions url={String(callback.live_captions_url)} who={s(task.name)} /> : null}
          {booked && (
            <p className="mt-1 text-sm text-muted">
              {confirm ? `Calling ${s(booked.vendor)} with the address and ${s(task.name)}'s number.` : "Vendor confirmation call next."}
            </p>
          )}
          {confirm?.live_captions_url ? <Captions url={String(confirm.live_captions_url)} who={s(booked?.vendor)} /> : null}
        </div>
      )}
    </article>
  );
}

function EarlierCalls({ calls }: { calls: Call[] }) {
  if (calls.length === 0) return null;
  return (
    <section className="py-16">
      <h2 className="font-serif text-4xl">Every call, on record</h2>
      <p className="mt-2 text-muted">From Vaani&rsquo;s call history: the summary, what was extracted, and the recording.</p>
      <ul className="mt-6 border-t border-line">
        {calls.map((c) => {
          const entity = (c.call_entity ?? {}) as Record<string, unknown>;
          return (
            <li key={c.call_id} className="grid gap-3 border-b border-line py-5 md:grid-cols-[10rem_1fr_16rem] md:gap-6">
              <div className="text-sm text-muted tabular-nums">
                {s(c.Start_time).replace("T", " ").slice(0, 16)}
                <span className="block">{s(c.call_type)} · {Math.round(Number(c.duration_ms ?? 0) / 1000)}s</span>
              </div>
              <div>
                <p className="max-w-[70ch] leading-relaxed">{s(c.call_summary)}</p>
                {Object.keys(entity).length > 0 && (
                  <p className="mt-1 text-sm text-muted">
                    {Object.entries(entity).filter(([, v]) => v).map(([k, v]) => `${k.replaceAll("_", " ")}: ${s(v)}`).join(" · ")}
                  </p>
                )}
              </div>
              <audio controls preload="none" src={`/api/recording/${encodeURIComponent(c.call_id)}`} className="h-9 w-full" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function Board() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [live, setLive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const loadCalls = useCallback(() => {
    fetch("/api/calls").then((r) => (r.ok ? r.json() : [])).then(setCalls).catch(() => {});
  }, []);

  useEffect(() => {
    loadCalls();
    const t = setInterval(loadCalls, 20000);
    const es = new EventSource("/api/events");
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (m) => {
      const e: Ev = JSON.parse(m.data);
      setEvents((prev) => (prev.some((p) => p.id === e.id) ? prev : [e, ...prev]));
      if (e.type === "report") loadCalls();
    };
    return () => {
      es.close();
      clearInterval(t);
    };
  }, [loadCalls]);

  const rehearse = async (k: string) => {
    setBusy(true);
    await fetch(`/api/demo/${k}`, { method: "POST" }).catch(() => {});
    setBusy(false);
  };

  const tasks = events.filter((e) => e.type === "task");
  const booked = events.filter((e) => e.type === "booked").length;

  return (
    <>
      <section className="pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/70 pb-4">
          <div>
            <h2 className="font-serif text-5xl">Right now</h2>
            <p className="mt-2 text-muted tabular-nums">
              {tasks.length} {tasks.length === 1 ? "request" : "requests"} · {booked} booked
            </p>
          </div>
          <span className={`label flex items-center gap-2 text-xs ${live ? "text-safe" : live === null ? "text-muted" : "text-scam"}`} role="status">
            <span className={`size-2 rounded-full ${live ? "on-duty bg-safe" : live === null ? "bg-muted" : "bg-scam"}`} aria-hidden />
            {live ? "Live" : live === null ? "Connecting" : "Reconnecting"}
          </span>
        </div>

        {tasks.length === 0 ? (
          <p className="py-14 text-center text-muted">No requests yet. Call the number, ask for a job, and watch Sorted ring around.</p>
        ) : (
          <div aria-live="polite" className="divide-y divide-line">
            {tasks.map((t) => <Request key={t.id} task={t} events={events} />)}
          </div>
        )}

        <p className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm text-muted">
          Rehearse without calling:
          {[["agreed", "Both agree"], ["none", "Nobody meets the budget"]].map(([k, label]) => (
            <button
              key={k}
              onClick={() => rehearse(k)}
              disabled={busy}
              className="rounded-full border border-line-strong px-3 py-1 transition hover:border-ink hover:text-ink disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </p>
      </section>

      <EarlierCalls calls={calls} />
    </>
  );
}
