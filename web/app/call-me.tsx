"use client";

import { useRef, useState } from "react";

// The languages Vaani's Sarvam voice and speech recognition cover, each in its own script.
// The backend checks the id again, so this list only decides what's offered.
const LANGS = [
  ["en", "English", "English"], ["hi", "हिन्दी", "Hindi"], ["kn", "ಕನ್ನಡ", "Kannada"], ["ta", "தமிழ்", "Tamil"],
  ["te", "తెలుగు", "Telugu"], ["ml", "മലയാളം", "Malayalam"], ["mr", "मराठी", "Marathi"], ["bn", "বাংলা", "Bengali"],
  ["gu", "ગુજરાતી", "Gujarati"], ["pa", "ਪੰਜਾਬੀ", "Punjabi"], ["od", "ଓଡ଼ିଆ", "Odia"],
] as const;

export default function CallMe() {
  const [state, setState] = useState<"idle" | "calling" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [lang, setLang] = useState("en");
  const pills = useRef<(HTMLButtonElement | null)[]>([]);

  async function submit(form: FormData) {
    setState("calling");
    const r = await fetch("/api/call-me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), language: lang }),
    }).catch(() => null);
    if (r?.ok) return setState("done");
    const detail = r ? (await r.json().catch(() => ({}))).detail : null;
    setError(typeof detail === "string" ? detail : "Couldn't start the call. Try calling the number instead.");
    setState("error");
  }

  // Arrow keys move between languages, as in any radio group.
  function onKey(e: { key: string; preventDefault(): void }, i: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + LANGS.length) % LANGS.length;
    setLang(LANGS[next][0]);
    pills.current[next]?.focus();
  }

  return (
    <form action={submit} className="rounded-2xl border border-line bg-paper/80 p-4">
      <p className="font-semibold">Or let Sorted call you</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="sr-only" htmlFor="cm-name">Your name</label>
        <input id="cm-name" name="name" placeholder="Your name" autoComplete="given-name"
          className="min-w-0 rounded-full border border-line-strong bg-paper px-4 py-2 placeholder:text-muted" />
        <label className="sr-only" htmlFor="cm-phone">Mobile number</label>
        <input id="cm-phone" name="phone" required inputMode="tel" placeholder="Mobile number" autoComplete="tel"
          className="min-w-0 rounded-full border border-line-strong bg-paper px-4 py-2 tabular-nums placeholder:text-muted" />
        <button disabled={state === "calling"} className="pill-dark rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50">
          {state === "calling" ? "Dialling…" : "Call me"}
        </button>
      </div>

      <p id="cm-lang-label" className="mt-3 text-sm text-muted">Speak to me in</p>
      <div role="radiogroup" aria-labelledby="cm-lang-label" className="mt-1.5 flex flex-wrap gap-1.5">
        {LANGS.map(([id, native, english], i) => {
          const on = lang === id;
          return (
            <button
              key={id}
              ref={(el) => { pills.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={english}
              title={english}
              tabIndex={on ? 0 : -1}
              onClick={() => setLang(id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`rounded-full border px-3 py-1 text-sm transition ${on ? "border-ink bg-ink text-paper" : "border-line-strong text-ink hover:border-ink"}`}
            >
              {native}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-muted" role="status">
        {state === "done" ? "Your phone rings in a few seconds, from +91 80642 79097."
          : state === "error" ? error : "Asks only your address, the issue and your budget."}
      </p>
    </form>
  );
}
