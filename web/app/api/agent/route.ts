export async function GET() {
  const r = await fetch(`${process.env.BACKEND_URL}/agent?key=${process.env.DOORMAN_KEY}`, { cache: "no-store" });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
}
