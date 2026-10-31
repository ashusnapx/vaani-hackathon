"use client";

import { Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Vendor = { name: string; phone_tail: string; services: string[] };
type Category = { id: string; label: string };

export default function Vendors() {
  const [list, setList] = useState<Vendor[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/vendors").then((r) => (r.ok ? r.json() : [])).then(setList).catch(() => {});
  }, []);
  useEffect(() => {
    load();
    fetch("/api/categories").then((r) => (r.ok ? r.json() : [])).then(setCats).catch(() => {});
  }, [load]);

  const label = (id: string) => (id === "*" ? "Any job" : cats.find((c) => c.id === id)?.label ?? id);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function add(form: FormData) {
    setBusy(true);
    setError("");
    const r = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), services: picked.length ? picked : ["*"] }),
    }).catch(() => null);
    if (r?.ok) {
      setPicked([]);
      load();
    } else setError(r ? String((await r.json().catch(() => ({}))).detail ?? "Couldn't add them.") : "Backend unreachable.");
    setBusy(false);
  }

  async function remove(name: string) {
    await fetch(`/api/vendors/${encodeURIComponent(name)}`, { method: "DELETE" }).catch(() => null);
    load();
  }

  // Group by category so it's obvious who gets rung for which kind of job.
  const groups = [...new Set(list.flatMap((v) => v.services))].sort((a, b) => (a === "*" ? 1 : b === "*" ? -1 : label(a).localeCompare(label(b))));

  return (
    <section>
      <h2 className="font-serif text-3xl">Service people</h2>
      <p className="mt-1 text-sm text-muted">Sorted rings only the people in a request&rsquo;s category, one at a time. Numbers stay on the server.</p>

      {list.length === 0 ? (
        <p className="mt-4 border-y border-line py-3 text-sm text-muted">Nobody on file yet. Add someone below.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((g) => (
            <div key={g}>
              <p className="label text-xs text-bronze">{label(g)}</p>
              <ul className="mt-1 divide-y divide-line border-y border-line">
                {list.filter((v) => v.services.includes(g)).map((v) => (
                  <li key={v.name} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{v.name}</span>
                      <span className="ml-2 text-sm text-muted tabular-nums">•••• {v.phone_tail}</span>
                    </span>
                    <button onClick={() => remove(v.name)} className="rounded-full p-2 text-muted hover:bg-surface hover:text-scam" aria-label={`Remove ${v.name}`}>
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <form action={add} className="mt-6 rounded-2xl border border-line bg-paper/80 p-4">
        <p className="font-semibold">Add a service person</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="sr-only" htmlFor="v-name">Name</label>
          <input id="v-name" name="name" required placeholder="Name, e.g. Ravi"
            className="rounded-full border border-line-strong bg-paper px-4 py-2 placeholder:text-muted" />
          <label className="sr-only" htmlFor="v-phone">Mobile number</label>
          <input id="v-phone" name="phone" required inputMode="tel" placeholder="Mobile number"
            className="rounded-full border border-line-strong bg-paper px-4 py-2 tabular-nums placeholder:text-muted" />
        </div>
        <fieldset className="mt-3">
          <legend className="text-sm text-muted">Jobs they take (none picked = any job)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {cats.filter((c) => c.id !== "other").map((c) => (
              <button type="button" key={c.id} onClick={() => toggle(c.id)} aria-pressed={picked.includes(c.id)}
                className={`rounded-full border px-3 py-1 text-sm transition ${picked.includes(c.id) ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>
        <button disabled={busy} className="pill-dark mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50">
          <UserPlus className="size-4" strokeWidth={1.75} aria-hidden /> {busy ? "Adding…" : "Add service person"}
        </button>
        {error && <p className="mt-2 text-sm text-scam" role="alert">{error}</p>}
      </form>
    </section>
  );
}
