"use client";

import { Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Vendor = { name: string; phone_tail: string; services: string[] };

export default function Vendors() {
  const [list, setList] = useState<Vendor[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/vendors").then((r) => (r.ok ? r.json() : [])).then(setList).catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function add(form: FormData) {
    setBusy(true);
    setError("");
    const services = String(form.get("services") || "").split(",").map((x) => x.trim()).filter(Boolean);
    const r = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), services: services.length ? services : ["*"] }),
    }).catch(() => null);
    if (r?.ok) load();
    else setError(r ? String((await r.json().catch(() => ({}))).detail ?? "Couldn't add them.") : "Backend unreachable.");
    setBusy(false);
  }

  async function remove(name: string) {
    await fetch(`/api/vendors/${encodeURIComponent(name)}`, { method: "DELETE" }).catch(() => null);
    load();
  }

  return (
    <section>
      <h2 className="font-serif text-3xl">Service people</h2>
      <p className="mt-1 text-sm text-muted">Sorted rings them in this order, one at a time. Numbers stay on the server.</p>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {list.length === 0 && <li className="py-3 text-sm text-muted">Nobody on file yet. Add someone below.</li>}
        {list.map((v, i) => (
          <li key={v.name} className="flex items-center gap-3 py-3">
            <span className="w-5 text-sm text-muted tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{v.name}</span>
              <span className="ml-2 text-sm text-muted tabular-nums">•••• {v.phone_tail}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {v.services.includes("*") ? "Any job" : v.services.join(", ")}
              </span>
            </span>
            <button onClick={() => remove(v.name)} className="rounded-full p-2 text-muted hover:bg-surface hover:text-scam" aria-label={`Remove ${v.name}`}>
              <Trash2 className="size-4" strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>
      <form action={add} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr]">
        <label className="sr-only" htmlFor="v-name">Name</label>
        <input id="v-name" name="name" required placeholder="Name, e.g. Ravi Plumbing"
          className="rounded-full border border-line-strong bg-paper px-4 py-2 placeholder:text-muted" />
        <label className="sr-only" htmlFor="v-phone">Mobile number</label>
        <input id="v-phone" name="phone" required inputMode="tel" placeholder="Mobile number"
          className="rounded-full border border-line-strong bg-paper px-4 py-2 tabular-nums placeholder:text-muted" />
        <label className="sr-only" htmlFor="v-services">Services</label>
        <input id="v-services" name="services" placeholder="Jobs, e.g. ac, plumber (blank = any)"
          className="rounded-full border border-line-strong bg-paper px-4 py-2 placeholder:text-muted sm:col-span-2" />
        <button disabled={busy} className="pill-dark flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 sm:col-span-2">
          <UserPlus className="size-4" strokeWidth={1.75} aria-hidden /> {busy ? "Adding…" : "Add service person"}
        </button>
        {error && <p className="text-sm text-scam sm:col-span-2" role="alert">{error}</p>}
      </form>
    </section>
  );
}
