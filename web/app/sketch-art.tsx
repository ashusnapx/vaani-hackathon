// Pencil strokes are computed here, on the server only. The browser gets the finished paths,
// so server HTML and client render can never disagree about a stroke.
import rough from "roughjs";
import { Sheet } from "./sketch";

type Gen = ReturnType<typeof rough.generator>;
type Drawable = ReturnType<Gen["line"]>;
export type Stroke = { d: string; stroke: string; strokeWidth: number; fill: string };

const PENCIL = { stroke: "#3b3a36", strokeWidth: 1.3, roughness: 1.7, bowing: 1.3 };
const RED = { ...PENCIL, stroke: "#a8321f" };
const GREEN = { ...PENCIL, stroke: "#3d6b45" };
const BRONZE = { ...PENCIL, stroke: "#8c6b45" };

function strokes(seed: number, draw: (rc: Gen) => Drawable[]): Stroke[] {
  const gen = rough.generator({ options: { seed } });
  return draw(gen).flatMap((d) => gen.toPaths(d)).map((p) => ({ d: p.d, stroke: p.stroke, strokeWidth: p.strokeWidth, fill: p.fill ?? "none" }));
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

const BEFORE = strokes(7, drawBefore);
const AFTER = strokes(11, drawAfter);
export const RING = strokes(3, (rc) => [rc.ellipse(100, 30, 192, 52, { ...BRONZE, strokeWidth: 2, roughness: 2.2 })]);

export function BeforeSketch() {
  return (
    <Sheet paths={BEFORE} label="You call three mechanics yourself; two don't answer.">
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
    <Sheet paths={AFTER} label="You call Sorted once; Sorted calls three mechanics and calls you back.">
      <text x="236" y="157" fontSize="20" textAnchor="middle" className="fill-[#8c6b45]">Sorted</text>
      <text x="118" y="122" fontSize="16" transform="rotate(-8 118 122)">one call</text>
      <text x="292" y="62" fontSize="16" className="fill-[#3d6b45]">₹800 · backup</text>
      <text x="296" y="140" fontSize="16" className="fill-[#3d6b45]">₹750 · best ★</text>
      <text x="300" y="270" fontSize="16" className="fill-[#a8321f]">no answer, next</text>
      <text x="112" y="290" fontSize="17" className="fill-[#3d6b45]">calls you back with the best</text>
    </Sheet>
  );
}

