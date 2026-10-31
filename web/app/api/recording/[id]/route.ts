export async function GET(_req: Request, ctx: RouteContext<"/api/recording/[id]">) {
  const { id } = await ctx.params;
  const r = await fetch(
    `${process.env.BACKEND_URL}/recording/${encodeURIComponent(id)}?key=${process.env.DOORMAN_KEY}`,
  );
  if (!r.ok || !r.body) return new Response("no recording yet", { status: r.status });
  return new Response(r.body, { headers: { "Content-Type": r.headers.get("content-type") ?? "audio/mpeg" } });
}
