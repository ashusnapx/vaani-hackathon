export async function POST(req: Request) {
  const r = await fetch(`${process.env.BACKEND_URL}/actions/call-me?key=${process.env.DOORMAN_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await req.text(),
  });
  return new Response(await r.text(), { status: r.status });
}
