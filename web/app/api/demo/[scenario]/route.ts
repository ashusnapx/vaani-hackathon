const SCENARIOS = new Set(["scam", "family", "message"]);

export async function POST(_req: Request, ctx: RouteContext<"/api/demo/[scenario]">) {
  const { scenario } = await ctx.params;
  if (!SCENARIOS.has(scenario)) return new Response("unknown scenario", { status: 404 });
  const r = await fetch(
    `${process.env.BACKEND_URL}/demo/${scenario}?key=${process.env.DOORMAN_KEY}`,
    { method: "POST" },
  );
  return new Response(await r.text(), { status: r.status });
}
