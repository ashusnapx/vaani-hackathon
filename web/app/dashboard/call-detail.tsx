"use client";

import { ArrowDownLeftIcon as ArrowDownLeft, ArrowUpRightIcon as ArrowUpRight, GlobeIcon as Globe } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

export type Row = Record<string, unknown> & { call_id: string };
export type Ev = { id: number; type: string; at: number } & Record<string, unknown>;
export type Agent = Record<string, unknown>;

export const s = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
export const inr = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const dur = (ms: unknown) => {
  const t = Math.round(Number(ms ?? 0) / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
export const when = (v: unknown) =>
  v ? new Date(String(v).endsWith("Z") ? String(v) : `${v}Z`).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
export const label = (k: string) => k.replaceAll("_", " ");

export function direction(r: Row) {
  const d = String(r.direction ?? r.call_type ?? "").toLowerCase();
  if (d.includes("web")) return { Icon: Globe, text: "Web" };
  if (d.includes("in")) return { Icon: ArrowDownLeft, text: "Inbound" };
  return { Icon: ArrowUpRight, text: "Outbound" };
}

export function statusTone(st: unknown) {
  const v = String(st ?? "").toLowerCase();
  if (v.includes("complet")) return "text-safe";
  if (v.includes("fail") || v.includes("reject") || v.includes("busy") || v.includes("no")) return "text-scam";
  return "text-pending";
}

export function KV({ data }: { data: unknown }) {
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

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-5">
      <h3 className="label mb-3 text-xs text-muted">{title}</h3>
      {children}
    </section>
  );
}

export function Transcript({ text }: { text: unknown }) {
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

export function FindPeople({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const t = toast.loading("Reading the call…");
    const res = await fetch(`/api/calls/${encodeURIComponent(id)}/process`, { method: "POST" }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    const ev = body.result as Record<string, unknown> | null;
    if (!res?.ok) toast.error("Couldn't start", { id: t, description: String(body.detail ?? "Backend unreachable.") });
    else if (ev?.type === "task")
      toast.success(`Ringing ${(ev.vendors as string[])?.length ?? 0} service people`, { id: t, description: `${s(ev.service)} for ${s(ev.name)}, budget ${inr(ev.budget)}` });
    else if (ev?.type === "intake_incomplete")
      toast.error("The call is missing details", { id: t, description: `Missing: ${(ev.missing as string[])?.join(", ")}` });
    else toast.success("Already handled", { id: t, description: "Nothing new to start from this call." });
    setBusy(false);
  }
  return (
    <button onClick={run} disabled={busy} className="pill-dark rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50">
      {busy ? "Starting…" : "Find service people for this call"}
    </button>
  );
}

export function Detail({ r }: { r: Row }) {
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
          <Icon className="size-4" aria-hidden /> {text}
        </span>
        <span className={`font-semibold ${statusTone(r.call_status)}`}>{s(r.call_status)}</span>
        <span className="text-sm text-muted">{s(r.sub_status)}</span>
      </div>
      <p className="mt-3 font-serif text-3xl tabular-nums">{s(r.from_number)} → {String(r.to_number ?? "").length > 20 ? "Sorted" : s(r.to_number)}</p>
      <p className="mt-1 text-sm text-muted tabular-nums">{r.call_id} · {dur(r.duration_ms)} · {inr(r.call_cost)}</p>
      {Boolean((r.call_entity as Record<string, unknown> | null)?.service) && <div className="mt-4"><FindPeople id={r.call_id} /></div>}

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
