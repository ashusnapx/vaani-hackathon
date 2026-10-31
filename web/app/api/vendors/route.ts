const url = () => `${process.env.BACKEND_URL}/vendors?key=${process.env.DOORMAN_KEY}`;

export async function GET() {
  const r = await fetch(url(), { cache: "no-store" });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
  const r = await fetch(url(), { method: "POST", headers: { "Content-Type": "application/json" }, body: await req.text() });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
}
