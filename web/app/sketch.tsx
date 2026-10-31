"use client";

import { animate, stagger } from "animejs";
import rough from "roughjs";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

type Gen = ReturnType<typeof rough.generator>;
type Drawable = ReturnType<Gen["line"]>;
const PENCIL = { stroke: "#3b3a36", strokeWidth: 1.3, roughness: 1.7, bowing: 1.3 };
const RED = { ...PENCIL, stroke: "#a8321f" };
const GREEN = { ...PENCIL, stroke: "#3d6b45" };
const BRONZE = { ...PENCIL, stroke: "#8c6b45" };

/** Pencil strokes, computed by rough.js during render so they are in the HTML before any script runs. */
function Strokes({ draw, seed }: { draw: (rc: Gen) => Drawable[]; seed: number }) {
  const paths = useMemo(() => {
    const gen = rough.generator({ options: { seed } });
    return draw(gen).flatMap((d) => gen.toPaths(d));
  }, [draw, seed]);
  return (
    <>
      {paths.map((p, i) => (
        <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? "none"} strokeLinecap="round" />
      ))}
    </>
  );
}

/** An SVG of pencil strokes that sketch themselves in when scrolled into view. */
function Sheet({ draw, children, label, seed }: { draw: (rc: Gen) => Drawable[]; children?: ReactNode; label: string; seed: number }) {
  const svg = useRef<SVGSVGElement>(null);
  const layer = useRef<SVGGElement>(null);

  useEffect(() => {
    const el = svg.current;
    const g = layer.current;
    if (!el || !g || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const paths = Array.from(g.querySelectorAll("path"));
    for (const p of paths) {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      animate(paths, { strokeDashoffset: 0, duration: 700, delay: stagger(18), ease: "inOutSine" });
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <svg ref={svg} viewBox="0 0 520 300" className="h-auto w-full" role="img" aria-label={label}>
      <g ref={layer}><Strokes draw={draw} seed={seed} /></g>
      <g className="font-hand fill-[#3b3a36]">{children}</g>
    </svg>
  );
}

function stickFigure(rc: Gen, x: number, y: number) {
  return [
    rc.circle(x, y - 46, 30, PENCIL),
    rc.line(x, y - 31, x, y + 30, PENCIL),
    rc.line(x, y - 12, x - 22, y + 12, PENCIL),
    rc.line(x, y - 12, x + 26, y - 26, PENCIL),
    rc.rectangle(x + 24, y - 44, 14, 24, { ...PENCIL, fill: "#3b3a3622", fillStyle: "hachure", hachureGap: 4 }),
    rc.line(x, y + 30, x - 16, y + 72, PENCIL),
    rc.line(x, y + 30, x + 16, y + 72, PENCIL),
  ];
}

function shop(rc: Gen, x: number, y: number) {
  return [
    rc.polygon([[x - 6, y + 18], [x + 34, y - 6], [x + 74, y + 18]], PENCIL),
    rc.rectangle(x, y + 18, 68, 46, PENCIL),
    rc.rectangle(x + 26, y + 38, 16, 26, PENCIL),
  ];
}

const SHOPS = [26, 118, 210];

function drawBefore(rc: Gen) {
  const nodes: Drawable[] = [...stickFigure(rc, 70, 158)];
  SHOPS.forEach((y, i) => {
    nodes.push(...shop(rc, 420, y));
    nodes.push(rc.curve([[112, 128], [220, 150 + (i - 1) * 70], [330, y + 30], [410, y + 40]], { ...PENCIL, roughness: 2.6 }));
  });
  // two of three never pick up
  for (const y of [SHOPS[0], SHOPS[2]]) {
    nodes.push(rc.line(426, y + 4, 486, y + 64, RED), rc.line(486, y + 4, 426, y + 64, RED));
  }
  return nodes;
}

function drawAfter(rc: Gen) {
  const nodes: Drawable[] = [...stickFigure(rc, 60, 158)];
  nodes.push(rc.line(100, 130, 196, 150, PENCIL));
  nodes.push(rc.circle(236, 150, 76, { ...BRONZE, fill: "#8c6b4520", fillStyle: "hachure", hachureGap: 5 }));
  SHOPS.forEach((y, i) => {
    nodes.push(...shop(rc, 420, y));
    nodes.push(rc.line(274, 150, 410, y + 40, { ...BRONZE, strokeLineDash: [6, 6] }));
    if (i !== 2) nodes.push(rc.path(`M494 ${y + 34} l6 8 l12 -16`, GREEN));
  });
  // and it calls you back
  nodes.push(rc.curve([[236, 190], [190, 270], [100, 262], [64, 236]], GREEN));
  nodes.push(rc.line(64, 236, 76, 232, GREEN), rc.line(64, 236, 70, 246, GREEN));
  return nodes;
}

export function BeforeSketch() {
  return (
    <Sheet draw={drawBefore} seed={7} label="You call three mechanics yourself; two don't answer.">
      <text x="98" y="72" fontSize="17" transform="rotate(-6 98 72)">explain again…</text>
      <text x="96" y="268" fontSize="17" transform="rotate(4 96 268)">and again…</text>
      <text x="330" y="22" fontSize="16" className="fill-[#a8321f]">no answer</text>
      <text x="318" y="136" fontSize="18">₹ ??</text>
      <text x="320" y="282" fontSize="16" className="fill-[#a8321f]">busy</text>
      <text x="236" y="200" fontSize="15" transform="rotate(-3 236 200)">"what's your budget?"</text>
    </Sheet>
  );
}

export function AfterSketch() {
  return (
    <Sheet draw={drawAfter} seed={11} label="You call Sorted once; Sorted calls three mechanics and calls you back.">
      <text x="236" y="157" fontSize="20" textAnchor="middle" className="fill-[#8c6b45]">Sorted</text>
      <text x="118" y="122" fontSize="16" transform="rotate(-8 118 122)">one call</text>
      <text x="292" y="62" fontSize="16" className="fill-[#3d6b45]">₹800 · backup</text>
      <text x="296" y="140" fontSize="16" className="fill-[#3d6b45]">₹750 · best ★</text>
      <text x="300" y="270" fontSize="16" className="fill-[#a8321f]">no answer, next</text>
      <text x="112" y="290" fontSize="17" className="fill-[#3d6b45]">calls you back with the best</text>
    </Sheet>
  );
}

/** A pencil ring drawn around a word. */
export function PencilRing({ children }: { children: ReactNode }) {
  const ring = useRef<SVGGElement>(null);
  const paths = useMemo(() => {
    const gen = rough.generator({ options: { seed: 3 } });
    return gen.toPaths(gen.ellipse(100, 30, 192, 52, { ...BRONZE, strokeWidth: 2, roughness: 2.2 }));
  }, []);
  useEffect(() => {
    const g = ring.current;
    if (!g || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(g.querySelectorAll("path"));
    for (const p of els) {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
    }
    animate(els, { strokeDashoffset: 0, duration: 900, delay: 600, ease: "inOutSine" });
  }, []);
  return (
    <span className="relative inline-block">
      {children}
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden
        className="pointer-events-none absolute -inset-x-[8%] -inset-y-[12%] h-[124%] w-[116%] overflow-visible">
        <g ref={ring}>
          {paths.map((p, i) => <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill="none" vectorEffect="non-scaling-stroke" />)}
        </g>
      </svg>
    </span>
  );
}
