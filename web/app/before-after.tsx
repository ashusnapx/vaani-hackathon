import { EyeOff, FileAudio, HandCoins, Phone, PhoneMissed, PhoneOutgoing, Repeat, User } from "lucide-react";
import Image from "next/image";

// Product facts for one job with three mechanics, not survey statistics.
const ROWS = [
  [PhoneOutgoing, "Calls you make", "3+", "1"],
  [Repeat, "Times you explain the job", "3+", "1"],
  [EyeOff, "People who hear your budget", "3", "0"],
  [HandCoins, "Bargaining done for you", "0", "every call"],
  [FileAudio, "Calls on record", "0%", "100%"],
] as const;

// Redseer figures as cited in coverage of Urban Company's 2025 IPO filing.
const MARKET = [
  ["$60B", "Indian home services, FY25"],
  ["90.5%", "through local, unorganised providers"],
  ["<1%", "booked online"],
] as const;

function Before() {
  return (
    <div className="relative h-36" aria-hidden>
      <span className="absolute top-1/2 left-0 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface-2 text-muted">
        <User className="size-5" strokeWidth={1.75} />
      </span>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        {[18, 50, 82].map((y, i) => (
          <path key={y} d={`M12 50 C 40 ${50 + (i - 1) * 60}, 60 ${y}, 86 ${y}`} className="stroke-muted/50" strokeWidth="1.5"
            strokeDasharray={i === 1 ? "0" : "3 4"} fill="none" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {[18, 50, 82].map((y, i) => (
        <span key={y} className={`absolute right-0 grid size-9 -translate-y-1/2 place-items-center rounded-full ${i === 1 ? "bg-surface-2 text-muted" : "bg-scam/10 text-scam"}`} style={{ top: `${y}%` }}>
          {i === 1 ? <Phone className="size-4" strokeWidth={1.75} /> : <PhoneMissed className="size-4" strokeWidth={1.75} />}
        </span>
      ))}
    </div>
  );
}

function After() {
  return (
    <div className="relative h-36" aria-hidden>
      <span className="pill-dark absolute top-1/2 left-0 grid size-11 -translate-y-1/2 place-items-center rounded-full">
        <User className="size-5" strokeWidth={1.75} />
      </span>
      <span className="absolute top-1/2 left-[38%] grid size-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper">
        <Image src="/vaani-logo.png" alt="" width={30} height={27} />
      </span>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d="M12 50 L38 50" className="stroke-ink" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
        {[18, 50, 82].map((y) => (
          <path key={y} d={`M50 50 C 66 50, 70 ${y}, 86 ${y}`} className="march stroke-bronze" strokeWidth="1.5" strokeDasharray="5 5" fill="none" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {[18, 50, 82].map((y) => (
        <span key={y} className="absolute right-0 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-safe/10 text-safe" style={{ top: `${y}%` }}>
          <Phone className="size-4" strokeWidth={1.75} />
        </span>
      ))}
    </div>
  );
}

export default function BeforeAfter() {
  return (
    <section className="py-16">
      <h2 className="font-serif text-5xl">Calling around, before and after</h2>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface/50 p-6">
          <p className="label text-xs text-muted">Before · you dial</p>
          <div className="mt-4"><Before /></div>
        </div>
        <div className="rounded-3xl border border-bronze/40 bg-paper p-6">
          <p className="label text-xs text-bronze">After · Sorted dials</p>
          <div className="mt-4"><After /></div>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line rounded-3xl border border-line bg-paper/70">
        {ROWS.map(([Icon, label, before, after]) => (
          <div key={label} className="grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-x-4 px-6 py-4 sm:grid-cols-[1.5rem_1fr_8rem_8rem]">
            <Icon className="size-5 text-bronze" strokeWidth={1.75} aria-hidden />
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
