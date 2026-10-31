"use client";

import { useEffect, useState } from "react";

// Shown in each language's own script; ids are what Vaani's Sarvam voice expects.
const NATIVE: Record<string, string> = {
  en: "English", hi: "हिन्दी", bn: "বাংলা", ta: "தமிழ்", te: "తెలుగు", kn: "ಕನ್ನಡ",
  ml: "മലയാളം", mr: "मराठी", gu: "ગુજરાતી", pa: "ਪੰਜਾਬੀ", od: "ଓଡ଼ିଆ",
};

export default function CallMe() {
  const [state, setState] = useState<"idle" | "calling" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [langs, setLangs] = useState<{ id: string; label: string }[]>([{ id: "en", label: "English" }]);

  useEffect(() => {
    fetch("/api/languages").then((r) => (r.ok ? r.json() : null)).then((l) => l && setLangs(l)).catch(() => {});
  }, []);

  async function submit(form: FormData) {
    setState("calling");
    const r = await fetch("/api/call-me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), language: form.get("language") }),
    }).catch(() => null);
    if (r?.ok) return setState("done");
    const detail = r ? (await r.json().catch(() => ({}))).detail : null;
    setError(typeof detail === "string" ? detail : "Couldn't start the call. Try calling the number instead.");
    setState("error");
  }

  return (
    <form action={submit} className="rounded-2xl border border-line bg-paper/80 p-4">
      <p className="font-semibold">Or let Sorted call you</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="sr-only" htmlFor="cm-name">Your name</label>
        <input id="cm-name" name="name" placeholder="Your name" autoComplete="given-name"
          className="min-w-0 rounded-full border border-line-strong bg-paper px-4 py-2 placeholder:text-muted" />
        <label className="sr-only" htmlFor="cm-phone">Mobile number</label>
        <input id="cm-phone" name="phone" required inputMode="tel" placeholder="Mobile number" autoComplete="tel"
          className="min-w-0 rounded-full border border-line-strong bg-paper px-4 py-2 tabular-nums placeholder:text-muted" />
        <label className="sr-only" htmlFor="cm-lang">Language</label>
        <select id="cm-lang" name="language" defaultValue="en"
          className="min-w-0 rounded-full border border-line-strong bg-paper px-4 py-2">
          {langs.map((l) => (
            <option key={l.id} value={l.id}>{NATIVE[l.id] ?? l.label}{NATIVE[l.id] && l.id !== "en" ? ` · ${l.label}` : ""}</option>
          ))}
        </select>
        <button disabled={state === "calling"} className="pill-dark rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50">
          {state === "calling" ? "Dialling…" : "Call me"}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted" role="status">
        {state === "done" ? "Your phone rings in a few seconds, from +91 80642 79097."
          : state === "error" ? error : "Asks only your address, the issue and your budget."}
      </p>
    </form>
  );
}
