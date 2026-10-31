"use client";

import { useState } from "react";

export default function CallMe() {
  const [state, setState] = useState<"idle" | "calling" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(form: FormData) {
    setState("calling");
    const r = await fetch("/api/call-me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), phone: form.get("phone") }),
    }).catch(() => null);
    if (r?.ok) return setState("done");
    const detail = r ? (await r.json().catch(() => ({}))).detail : null;
    setError(typeof detail === "string" ? detail : "Couldn't start the call. Try calling the number instead.");
    setState("error");
  }

  return (
    <form action={submit} className="rounded-2xl border border-line bg-paper/80 p-4">
      <p className="font-semibold">Or let Sorted call you</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="cm-name">Your name</label>
        <input id="cm-name" name="name" placeholder="Your name" autoComplete="given-name"
          className="min-w-0 flex-1 rounded-full border border-line-strong bg-paper px-4 py-2 placeholder:text-muted" />
        <label className="sr-only" htmlFor="cm-phone">Mobile number</label>
        <input id="cm-phone" name="phone" required inputMode="tel" placeholder="Mobile number" autoComplete="tel"
          className="min-w-0 flex-1 rounded-full border border-line-strong bg-paper px-4 py-2 tabular-nums placeholder:text-muted" />
        <button disabled={state === "calling"} className="pill-dark rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50">
          {state === "calling" ? "Dialling…" : "Call me"}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted" role="status">
        {state === "done" ? "Your phone will ring in a few seconds, from +91 80642 79097."
          : state === "error" ? error : "Sorted rings you and takes the request on that call."}
      </p>
    </form>
  );
}
