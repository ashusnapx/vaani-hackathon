"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type Ev = { id: number; type: string; at: number } & Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(v));
const inr = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN")}`;

// What each thing Sorted does looks like as a toast. Anything not listed stays quiet.
const SAY: Record<string, (e: Ev) => [kind: "info" | "success" | "warning" | "error", title: string, body?: string]> = {
  task: (e) => ["info", `New request from ${s(e.name)}`, `${s(e.service)} · budget ${inr(e.budget)} · ringing ${(e.vendors as string[])?.length ?? 0}`],
  intake_call: (e) => ["info", `Calling ${s(e.to)}`, "A website request"],
  vendor_call: (e) => ["info", `Calling ${s(e.vendor)}`, "Asking for a price"],
  quote: (e) => !Number(e.price)
    ? ["warning", `${s(e.vendor)}: no deal`, s(e.notes)]
    : [e.agreed ? "success" : "warning", `${s(e.vendor)} quoted ${inr(e.price)}${e.price_max ? `–${Number(e.price_max).toLocaleString("en-IN")}` : ""}`,
       e.agreed ? "Fits the budget" : e.maybe ? "Could fit the budget" : "Over the budget"],
  counter: (e) => ["info", `Counter-offer: ${inr(e.offer)}`, `Taking it to ${s(e.vendor)}`],
  decision: (e) => {
    const best = e.best as Record<string, unknown> | null;
    return best ? ["success", `Best option: ${s(best.vendor)} at ${inr(best.price)}`, "Calling the customer back"] : ["warning", "Nobody could take it", "Calling the customer back with the news"];
  },
  callback: (e) => ["info", `Calling ${s(e.to)} back`, "With the options"],
  booked: (e) => ["success", `Booked ${s(e.vendor)} at ${inr(e.price)}`, s(e.eta)],
  confirm_call: (e) => ["info", `Confirming with ${s(e.vendor)}`],
  locked: (e) => ["success", `Price locked with ${s(e.vendor)}`, "On a recorded call"],
  rated: (e) => ["success", `${s(e.vendor)} rated ${s(e.rating)}/5`, s(e.comment)],
  declined: () => ["warning", "The customer didn't pick an option"],
  cancelled: () => ["warning", "A request was cancelled by phone"],
  rescheduled: (e) => ["info", "A job was moved", s(e.when)],
  intake_incomplete: (e) => ["error", "A call was missing details", `Missing: ${(e.missing as string[])?.join(", ")}`],
  lock_failed: (e) => ["warning", `${s(e.vendor)} didn't confirm the price`],
};

/** A toast for each thing Sorted does while this page is open. History replayed on connect stays quiet. */
export default function LiveToasts() {
  useEffect(() => {
    const opened = Date.now() / 1000;
    const seen = new Set<number>();
    const es = new EventSource("/api/events");
    es.onmessage = (m) => {
      const e: Ev = JSON.parse(m.data);
      if (e.at < opened - 1 || seen.has(e.id) || !SAY[e.type]) return;
      seen.add(e.id);
      const [kind, title, body] = SAY[e.type](e);
      toast[kind](title, body ? { description: body } : undefined);
    };
    return () => es.close();
  }, []);
  return null;
}
