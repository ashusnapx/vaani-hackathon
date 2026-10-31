"use client";

import { animate, stagger } from "animejs";
import { Lightning, PhoneCall, Snowflake, Wrench } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef } from "react";

// One call fans out to three repairmen and comes back as a yes. Positions are in % of a square stage.
const VENDORS = [
  { name: "Sharma Cooling", Icon: Snowflake, y: 14, from: "₹1,100", to: "₹800", verdict: "Agreed", tone: "text-safe" },
  { name: "Cool Care", Icon: Wrench, y: 46, from: "₹950", to: "₹750", verdict: "Best", tone: "text-family" },
  { name: "Fix-It Electric", Icon: Lightning, y: 78, from: "₹1,400", to: "₹1,200", verdict: "Over budget", tone: "text-pending" },
];

export default function HeroArt() {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const q = (sel: string) => Array.from(el.querySelectorAll<SVGPathElement | HTMLElement>(sel));
    const run = () => {
      animate(q("[data-node]"), { opacity: [0, 1], scale: [0.9, 1], duration: 500, ease: "outExpo" });
      animate(q("[data-draw='out']"), { opacity: [0, 1], duration: 500, delay: stagger(140, { start: 350 }), ease: "outQuad" });
      animate(q("[data-vendor]"), { opacity: [0, 1], translateX: [16, 0], duration: 500, delay: stagger(140, { start: 700 }), ease: "outExpo" });
      animate(q("[data-from]"), { opacity: [1, 0.45], duration: 300, delay: stagger(140, { start: 1400 }) });
      animate(q("[data-to]"), { opacity: [0, 1], translateY: [6, 0], duration: 400, delay: stagger(140, { start: 1500 }), ease: "outBack(2)" });
      animate(q("[data-verdict]"), { opacity: [0, 1], scale: [1.9, 1], rotate: ["-16deg", "-4deg"], duration: 420, delay: stagger(160, { start: 2000 }), ease: "outQuart" });
      animate(q("[data-draw='back']"), { opacity: [0, 1], duration: 600, delay: 2500, ease: "outQuad" });
      animate(q("[data-callback]"), { opacity: [0, 1], translateY: [8, 0], duration: 500, delay: 3200, ease: "outExpo" });
    };
    run();
  }, []);

  return (
    <div ref={stage} className="relative mx-auto aspect-square w-full max-w-[34rem] select-none" aria-hidden>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
        <path data-draw="out" d="M22 50 L42 50" className="stroke-ink" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
        {VENDORS.map((v) => (
          <path key={v.name} data-draw="out" d={`M42 50 C52 50, 52 ${v.y + 6}, 60 ${v.y + 6}`}
            className="march stroke-bronze" strokeWidth="1.5" strokeDasharray="5 5" fill="none" vectorEffect="non-scaling-stroke" />
        ))}
        <path data-draw="back" d="M60 62 C56 96, 14 96, 12 64" className="stroke-safe" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
        <path data-draw="back" d="M9.5 67 L12 63 L15 66.5" className="stroke-safe" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* the caller */}
      <div data-node className="absolute top-1/2 left-0 w-[24%] -translate-y-1/2 text-center">
        <div className="pill-dark mx-auto grid size-14 place-items-center rounded-full">
          <PhoneCall className="size-6" />
        </div>
        <p className="mt-2 text-sm font-semibold">Priya</p>
        <p className="text-xs text-muted">AC not cooling<br />budget ₹800</p>
      </div>

      {/* Sorted, speaking with Vaani's voice; call waves spread from it */}
      <div data-node className="absolute top-1/2 left-[42%] -translate-x-1/2 -translate-y-1/2">
        {[0, 0.8, 1.6].map((d) => (
          <span key={d} className="ripple absolute inset-0 rounded-full border border-bronze/40" style={{ animationDelay: `${d}s` }} />
        ))}
        <div className="relative grid size-18 place-items-center rounded-full border border-line bg-paper shadow-[0_10px_30px_-10px_#8c6b4599]">
          <Image src="/vaani-logo.png" alt="" width={44} height={40} priority />
        </div>
        <p className="absolute top-full left-1/2 mt-2 -translate-x-1/2 text-xs whitespace-nowrap text-muted">Sorted · Vaani voice</p>
      </div>

      {/* the vendors */}
      {VENDORS.map(({ name, Icon, y, from, to, verdict, tone }) => (
        <div key={name} data-vendor className="absolute right-0 w-[40%] rounded-2xl border border-line bg-paper/90 p-3 shadow-[0_8px_24px_-14px_#1a1f2440]"
          style={{ top: `${y}%` }}>
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-bronze" />
            <span className="truncate text-sm font-semibold">{name}</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span data-from className="text-sm text-muted line-through">{from}</span>
            <span data-to className="font-serif text-2xl tabular-nums">{to}</span>
          </div>
          <span data-verdict className={`stamp absolute -top-3 -right-2 bg-paper text-[0.7rem] ${tone}`}>{verdict}</span>
        </div>
      ))}

      {/* the callback */}
      <p data-callback className="absolute bottom-[1%] left-[30%] font-serif text-lg text-safe italic">
        &ldquo;Cool Care, ₹750, tomorrow at 11. Shall I book?&rdquo;
      </p>
    </div>
  );
}
