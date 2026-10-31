"use client";

import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";

type Event = { id: number; type: string; at: number } & Record<string, unknown>;

const STATUS: Record<string, [string, string]> = {
  trusted: ["Known family number", "text-family"],
  family_verified: ["Code word correct — family", "text-family"],
  family_unverified: ["Says family, unknown number — asking the code word", "text-brass"],
  family_code_wrong: ["Wrong code word — likely a cloned voice", "text-scam"],
  reported_scam: ["Number reported as scam", "text-scam"],
  unknown: ["Unknown caller — screening", "text-mute"],
};

const s = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const time = (at: number) =>
  new Date(at * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function Field({ k, v }: { k: string; v: unknown }) {
  return (
    <div>
      <dt className="text-xs tracking-wider text-mute uppercase">{k}</dt>
      <dd className="mt-0.5">{s(v)}</dd>
    </div>
  );
}

function Entry({ e }: { e: Event }) {
  if (e.type === "alert")
    return (
      <div className="rounded-2xl border border-scam/50 bg-scam/10 p-5">
        <p className="flex items-center justify-between font-serif text-2xl text-scam">
          Scam stopped
          <span className="rounded-full border border-scam px-2 py-0.5 font-sans text-xs tracking-wider uppercase">
            Family alerted
          </span>
        </p>
        <p className="mt-1 text-lg">{s(e.scam_type)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Field k="Claimed" v={e.caller_claims} />
          <Field k="Wanted" v={e.demand} />
          <Field k="Amount" v={e.amount} />
          <Field k="Pay to" v={e.payment_details} />
        </dl>
      </div>
    );
  if (e.type === "message")
    return (
      <div className="rounded-2xl border border-safe/40 bg-safe/10 p-5">
        <p className="font-serif text-2xl text-safe">Message for Kamla ji</p>
        <p className="mt-1 text-lg">{s(e.purpose)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Field k="From" v={`${s(e.caller_name)}, ${s(e.organisation)}`} />
          <Field k="Call back" v={e.callback_number} />
        </dl>
      </div>
    );
  if (e.type === "check") {
    const [label, tone] = STATUS[String(e.status)] ?? [s(e.status), "text-mute"];
    const who = [e.claimed_name, e.claimed_relation].filter(Boolean).join(", ") || "Caller";
    return (
      <div className="rounded-2xl border border-line bg-ink-2 p-5">
        <p className="text-sm text-mute">Checked who is calling</p>
        <p className="mt-1 text-lg">{who}</p>
        <p className={`mt-1 ${tone}`}>{label}</p>
      </div>
    );
  }
  if (e.type === "report") {
    const entities = (e.entities ?? {}) as Record<string, unknown>;
    const outcome = (e.dispositions as Record<string, unknown> | undefined)?.outcome;
    return (
      <div className="rounded-2xl border border-brass/40 bg-ink-2 p-5">
        <p className="flex items-center justify-between font-serif text-2xl text-brass">
          Call report
          {outcome ? (
            <span className="rounded-full bg-brass px-2 py-0.5 font-sans text-xs text-ink">{s(outcome)}</span>
          ) : null}
        </p>
        <p className="mt-2 leading-relaxed">{s(e.summary)}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {Object.entries(entities)
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <span key={k} className="rounded-full border border-line px-2 py-1 text-mute">
                {k.replaceAll("_", " ")}: <span className="text-ivory">{s(v)}</span>
              </span>
            ))}
        </div>
      </div>
    );
  }
  return (
    <p className="px-1 text-sm text-mute">
      {s(e.event).replaceAll("_", " ")} · {s(e.call_id)}
    </p>
  );
}

export default function VisitorLog() {
  const [events, setEvents] = useState<Event[]>([]);
  const [live, setLive] = useState(false);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (m) => {
      const e: Event = JSON.parse(m.data);
      setEvents((prev) => (prev.some((p) => p.id === e.id) ? prev : [e, ...prev]));
    };
    return () => es.close();
  }, []);

  // Stamp the newest entry in; an alert lands harder than the rest.
  const newest = events[0];
  useEffect(() => {
    const el = list.current?.firstElementChild;
    if (!el || !newest || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const alert = newest.type === "alert";
    animate(el, {
      opacity: [0, 1],
      scale: [alert ? 1.08 : 1.03, 1],
      translateY: [alert ? -24 : -10, 0],
      rotate: [alert ? -1.5 : 0, 0],
      duration: alert ? 700 : 450,
      ease: alert ? "outElastic(1, .6)" : "outExpo",
    });
  }, [newest]);

  const count = (f: (e: Event) => boolean) => events.filter(f).length;
  const stats = [
    ["Callers screened", count((e) => e.type === "check")],
    ["Scams stopped", count((e) => e.type === "alert")],
    ["Messages taken", count((e) => e.type === "message")],
  ] as const;

  const demo = (scenario: string) => fetch(`/api/demo/${scenario}`, { method: "POST" });

  return (
    <section className="lg:pt-16">
      <div className="flex items-end justify-between border-b border-line pb-4">
        <h2 className="font-serif text-4xl">Visitor log</h2>
        <span className={`text-sm ${live ? "text-safe" : "text-scam"}`}>{live ? "● Live" : "○ Reconnecting"}</span>
      </div>

      <dl className="grid grid-cols-3 gap-4 border-b border-line py-6">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dd className="font-serif text-5xl tabular-nums">{v}</dd>
            <dt className="mt-1 text-sm text-mute">{k}</dt>
          </div>
        ))}
      </dl>

      {events.length === 0 ? (
        <p className="py-16 text-center text-mute">
          Quiet at the door. Call the number and watch Doorman work.
        </p>
      ) : (
        <ol ref={list} aria-live="polite" className="space-y-3 py-6">
          {events.map((e) => (
            <li key={e.id}>
              <p className="mb-1 px-1 text-xs text-mute tabular-nums">{time(e.at)}</p>
              <Entry e={e} />
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm text-mute">
        Simulate a call:
        {["scam", "family", "message"].map((sc) => (
          <button
            key={sc}
            onClick={() => demo(sc)}
            className="rounded-full border border-line px-3 py-1 transition hover:border-brass hover:text-ivory"
          >
            {sc}
          </button>
        ))}
      </div>
    </section>
  );
}
