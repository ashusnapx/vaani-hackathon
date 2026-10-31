export async function POST(_req: Request, ctx: RouteContext<"/api/calls/[id]/process">) {
  const { id } = await ctx.params;
  const r = await fetch(`${process.env.BACKEND_URL}/calls/${encodeURIComponent(id)}/process?key=${process.env.DOORMAN_KEY}`, { method: "POST" });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
}
