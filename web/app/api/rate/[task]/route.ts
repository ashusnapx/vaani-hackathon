export async function POST(_req: Request, ctx: RouteContext<"/api/rate/[task]">) {
  const { task } = await ctx.params;
  const r = await fetch(`${process.env.BACKEND_URL}/actions/rate/${encodeURIComponent(task)}?key=${process.env.DOORMAN_KEY}`, { method: "POST" });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
}
