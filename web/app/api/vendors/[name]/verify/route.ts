export async function POST(_req: Request, ctx: RouteContext<"/api/vendors/[name]/verify">) {
  const { name } = await ctx.params;
  const r = await fetch(`${process.env.BACKEND_URL}/vendors/${encodeURIComponent(name)}/verify?key=${process.env.DOORMAN_KEY}`, { method: "POST" });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
}
