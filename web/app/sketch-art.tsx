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
// The people in a request's call thread, in a 100×100 box: the customer on the phone,
// service people with a cap, spanner and toolbox, and a pencil ring for Sorted's logo.
const FINE = { ...PENCIL, strokeWidth: 1.6, roughness: 1.1, bowing: 0.8 };
const FINE_BRONZE = { ...FINE, stroke: "#8c6b45" };
const HATCH = { fillStyle: "hachure", hachureGap: 3 } as const;

function customer(rc: Gen) {
  return [
    rc.circle(44, 24, 22, FINE),
    rc.line(44, 35, 44, 68, FINE),
    rc.line(44, 68, 34, 94, FINE), rc.line(44, 68, 54, 94, FINE),
    rc.line(44, 44, 30, 62, FINE),
    rc.line(44, 44, 59, 47, FINE), rc.line(59, 47, 59, 33, FINE),
    rc.rectangle(55, 15, 9, 18, { ...FINE, fill: "#3b3a3633", ...HATCH }),
    rc.arc(66, 24, 10, 14, -Math.PI / 3, Math.PI / 3, false, FINE),
    rc.arc(66, 24, 20, 26, -Math.PI / 3, Math.PI / 3, false, FINE),
  ];
}

function mechanic(rc: Gen) {
  return [
    rc.circle(44, 27, 22, FINE),
    rc.path("M33 25 Q44 6 55 25 Z", { ...FINE_BRONZE, fill: "#8c6b4540", ...HATCH }),
    rc.line(52, 25, 65, 27, FINE_BRONZE),
    rc.line(44, 38, 44, 70, FINE),
    rc.line(44, 70, 34, 95, FINE), rc.line(44, 70, 54, 95, FINE),
    rc.line(44, 46, 62, 40, FINE),
    rc.line(60, 43, 75, 24, { ...FINE_BRONZE, strokeWidth: 2.6 }),
    rc.circle(78, 19, 11, FINE_BRONZE),
    rc.line(44, 46, 28, 57, FINE),
    rc.rectangle(14, 62, 26, 15, { ...FINE, fill: "#3b3a3622", ...HATCH }),
    rc.path("M21 62 Q27 53 33 62", FINE),
  ];
}

export type People = { customer: Stroke[]; vendors: Stroke[][]; sorted: Stroke[] };
export const PEOPLE: People = {
  customer: strokes(21, customer),
  // a few seeds, so two service people side by side aren't drawn stroke for stroke the same
  vendors: [31, 32, 33].map((seed) => strokes(seed, mechanic)),
  sorted: strokes(41, (rc) => [rc.circle(50, 50, 88, { ...FINE_BRONZE, roughness: 1.5 }), rc.circle(51, 49, 82, { ...FINE_BRONZE, strokeWidth: 0.9 })]),
};

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

