"use client";

import { PencilSimple, Trash, UserPlus, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

type Vendor = { name: string; phone_tail: string; services: string[]; verified?: boolean; rating?: number | null; ratings?: number };
type Category = { id: string; label: string };

export default function Vendors() {
  const [list, setList] = useState<Vendor[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
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
  const reset = () => { setName(""); setPhone(""); setPicked([]); setEditing(null); setError(""); };

  function edit(v: Vendor) {
    setEditing(v.name);
    setName(v.name);
    setPhone("");
    setPicked(v.services.filter((x) => x !== "*"));
    setError("");
    document.getElementById("vendor-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function save(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, services: picked.length ? picked : ["*"] }),
    }).catch(() => null);
    if (r?.ok) { reset(); load(); }
    else setError(r ? String((await r.json().catch(() => ({}))).detail ?? "Couldn't save.") : "Backend unreachable.");
    setBusy(false);
  }

  async function verify(n: string) {
    await fetch(`/api/vendors/${encodeURIComponent(n)}/verify`, { method: "POST" }).catch(() => null);
    load();
  }

  async function remove(n: string) {
    if (editing === n) reset();
    await fetch(`/api/vendors/${encodeURIComponent(n)}`, { method: "DELETE" }).catch(() => null);
    load();
  }

  // Grouped by category, so it's obvious who gets rung for which kind of job.
  const groups = [...new Set(list.flatMap((v) => v.services))]
    .sort((a, b) => (a === "*" ? 1 : b === "*" ? -1 : label(a).localeCompare(label(b))));

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-3xl">On file</h2>
          <p className="text-sm text-muted tabular-nums">{list.length} {list.length === 1 ? "person" : "people"}</p>
        </div>
        {list.length === 0 ? (
          <p className="mt-4 border-y border-line py-4 text-muted">Nobody yet. Add the first service person on the right.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {groups.map((g) => (
              <div key={g}>
                <p className="label text-xs text-bronze">{label(g)}</p>
                <ul className="mt-1 divide-y divide-line border-y border-line">
                  {list.filter((v) => v.services.includes(g)).map((v) => (
                    <li key={v.name} className={`flex flex-wrap items-center gap-3 py-3 ${editing === v.name ? "bg-surface/70" : ""}`}>
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{v.name}</span>
                        <span className="ml-2 text-sm text-muted tabular-nums">•••• {v.phone_tail}</span>
                        <span className="ml-2 text-sm tabular-nums">
                          {v.rating ? <>★ {v.rating} <span className="text-muted">({v.ratings})</span></> : <span className="text-muted">no ratings yet</span>}
                        </span>
                      </span>
                      <button onClick={() => verify(v.name)} aria-pressed={!!v.verified}
                        className={`rounded-full border px-2.5 py-0.5 text-xs ${v.verified ? "border-family text-family" : "border-line-strong text-muted hover:border-ink"}`}>
                        {v.verified ? "Verified" : "Verify"}
                      </button>
                      <button onClick={() => edit(v)} className="rounded-full p-2 text-muted hover:bg-surface hover:text-ink" aria-label={`Edit ${v.name}`}>
                        <PencilSimple className="size-4" />
                      </button>
                      <button onClick={() => remove(v.name)} className="rounded-full p-2 text-muted hover:bg-surface hover:text-scam" aria-label={`Delete ${v.name}`}>
                        <Trash className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <form id="vendor-form" onSubmit={save} className="self-start rounded-3xl border border-line bg-paper/80 p-6 lg:sticky lg:top-6">
        <div className="flex items-center justify-between">
          <p className="font-serif text-2xl">{editing ? `Edit ${editing}` : "Add a service person"}</p>
          {editing && (
            <button type="button" onClick={reset} className="flex items-center gap-1 text-sm text-muted hover:text-ink">
              <X className="size-4" aria-hidden /> Cancel
            </button>
          )}
        </div>
        <div className="mt-4 grid gap-2">
          <label className="text-sm text-muted" htmlFor="v-name">Name</label>
          <input id="v-name" value={name} onChange={(e) => setName(e.target.value)} required readOnly={!!editing} placeholder="e.g. Ravi"
            className="rounded-full border border-line-strong bg-paper px-4 py-2 placeholder:text-muted read-only:text-muted" />
          <label className="mt-2 text-sm text-muted" htmlFor="v-phone">Mobile number</label>
          <input id="v-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required={!editing} inputMode="tel"
            placeholder={editing ? "Leave blank to keep the current number" : "10-digit mobile"}
            className="rounded-full border border-line-strong bg-paper px-4 py-2 tabular-nums placeholder:text-muted" />
        </div>
        <fieldset className="mt-4">
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
        <button disabled={busy} className="pill-dark mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
          {editing ? <PencilSimple className="size-4" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
          {busy ? "Saving…" : editing ? "Save changes" : "Add service person"}
        </button>
        {error && <p className="mt-2 text-sm text-scam" role="alert">{error}</p>}
      </form>
    </div>
  );
}
