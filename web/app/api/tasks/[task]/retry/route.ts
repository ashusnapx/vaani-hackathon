export async function POST(req: Request, ctx: RouteContext<"/api/tasks/[task]/retry">) {
  const { task } = await ctx.params;
  const step = new URL(req.url).searchParams.get("step") ?? "";
  const r = await fetch(
    `${process.env.BACKEND_URL}/tasks/${encodeURIComponent(task)}/retry?step=${encodeURIComponent(step)}&key=${process.env.DOORMAN_KEY}`,
    { method: "POST" },
  );
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
}
