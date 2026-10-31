export async function DELETE(_req: Request, ctx: RouteContext<"/api/vendors/[name]">) {
  const { name } = await ctx.params;
  const r = await fetch(`${process.env.BACKEND_URL}/vendors/${encodeURIComponent(name)}?key=${process.env.DOORMAN_KEY}`, {
    method: "DELETE",
  });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
}
