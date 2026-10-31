import { EyeSlash, FileAudio, HandCoins, PhoneOutgoing, Repeat } from "@phosphor-icons/react/dist/ssr";
import { AfterSketch, BeforeSketch } from "./sketch-art";

// Product facts for one job with three mechanics, not survey statistics.
const ROWS = [
  [PhoneOutgoing, "Calls you make", "3+", "1"],
  [Repeat, "Times you explain the job", "3+", "1"],
  [EyeSlash, "People who hear your budget", "3", "0"],
  [HandCoins, "Bargaining done for you", "0", "every call"],
  [FileAudio, "Calls on record", "0%", "100%"],
] as const;

// Redseer figures as cited in coverage of Urban Company's 2025 IPO filing.
const MARKET = [
  ["$60B", "Indian home services, FY25"],
  ["90.5%", "through local, unorganised providers"],
  ["<1%", "booked online"],
] as const;


export default function BeforeAfter() {
  return (
    <section className="py-16">
      <h2 className="font-serif text-5xl">Calling around, before and after</h2>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface/50 p-6">
          <p className="label text-xs text-muted">Before · you dial</p>
          <div className="mt-2"><BeforeSketch /></div>
        </div>
        <div className="rounded-3xl border border-bronze/40 bg-paper p-6">
          <p className="label text-xs text-bronze">After · Sorted dials</p>
          <div className="mt-2"><AfterSketch /></div>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line rounded-3xl border border-line bg-paper/70">
        {ROWS.map(([Icon, label, before, after]) => (
          <div key={label} className="grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-x-4 px-6 py-4 sm:grid-cols-[1.5rem_1fr_8rem_8rem]">
            <Icon className="size-5 text-bronze" weight="duotone" aria-hidden />
            <dt>{label}</dt>
            <dd className="text-right font-serif text-3xl text-muted tabular-nums line-through decoration-scam/60 decoration-2">{before}</dd>
            <dd className="text-right font-serif text-3xl text-ink tabular-nums">{after}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">For one job priced by three mechanics.</p>

      <dl className="mt-14 grid gap-6 border-y border-line py-8 sm:grid-cols-3">
        {MARKET.map(([n, label]) => (
          <div key={label}>
            <dd className="font-serif text-6xl tabular-nums">{n}</dd>
            <dt className="mt-1 text-muted">{label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">The work still runs on phone calls. Sources in the footer.</p>
    </section>
  );
}
