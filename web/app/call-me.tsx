"use client";

import { DeviceMobile, PhoneCall, Translate, User } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

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
    const english = LANGS.find(([id]) => id === lang)?.[2] ?? "English";
    const id = toast.loading("Dialling you…", { description: "From +91 80642 79097" });
    const r = await fetch("/api/call-me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), language: lang }),
    }).catch(() => null);
    if (r?.ok) {
      toast.success("Sorted is calling you", {
        id,
        duration: 8000,
        description: `Pick up the call from +91 80642 79097. We'll ask your address, the issue and your budget, in ${english}.`,
      });
      return setState("done");
    }
    const detail = r ? (await r.json().catch(() => ({}))).detail : null;
    const message = typeof detail === "string" ? detail : "Couldn't start the call. Try calling the number instead.";
    toast.error("Couldn't place the call", { id, description: message, duration: 8000 });
    setError(message);
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
        <label className="relative">
          <span className="sr-only">Your name</span>
          <User className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input name="name" placeholder="Your name" autoComplete="given-name"
            className="w-full min-w-0 rounded-full border border-line-strong bg-paper py-2 pr-4 pl-10 placeholder:text-muted" />
        </label>
        <label className="relative">
          <span className="sr-only">Mobile number</span>
          <DeviceMobile className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input name="phone" required inputMode="tel" placeholder="Mobile number" autoComplete="tel"
            className="w-full min-w-0 rounded-full border border-line-strong bg-paper py-2 pr-4 pl-10 tabular-nums placeholder:text-muted" />
        </label>
        <button disabled={state === "calling"} className="pill-dark flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50">
          <PhoneCall className="size-4" weight="fill" aria-hidden />
          {state === "calling" ? "Dialling…" : "Call me"}
        </button>
      </div>

      <p id="cm-lang-label" className="mt-3 flex items-center gap-1.5 text-sm text-muted">
        <Translate className="size-4" aria-hidden /> Speak to me in
      </p>
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
