"use client";

import { animate, stagger } from "animejs";
import { type ReactNode, useEffect, useRef } from "react";
import type { Stroke } from "./sketch-art";

function drawOn(paths: SVGPathElement[], delay = 0) {
  for (const p of paths) {
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
  }
  animate(paths, { strokeDashoffset: 0, duration: 700, delay: stagger(18, { start: delay }), ease: "inOutSine" });
}

/** An SVG of pencil strokes (computed on the server) that sketch themselves in when scrolled into view. */
export function Sheet({ paths, children, label }: { paths: Stroke[]; children?: ReactNode; label: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const layer = useRef<SVGGElement>(null);

  useEffect(() => {
    const el = svg.current;
    const g = layer.current;
    if (!el || !g || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(g.querySelectorAll("path"));
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      drawOn(els);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <svg ref={svg} viewBox="0 0 520 300" className="h-auto w-full" role="img" aria-label={label}>
      <g ref={layer}>
        {paths.map((p, i) => <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} strokeLinecap="round" />)}
      </g>
      <g className="font-hand fill-[#3b3a36]">{children}</g>
    </svg>
  );
}

/** A pencil ring drawn around a word. */
export function PencilRing({ paths, children }: { paths: Stroke[]; children: ReactNode }) {
  const ring = useRef<SVGGElement>(null);
  useEffect(() => {
    const g = ring.current;
    if (g && !matchMedia("(prefers-reduced-motion: reduce)").matches) drawOn(Array.from(g.querySelectorAll("path")), 600);
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
