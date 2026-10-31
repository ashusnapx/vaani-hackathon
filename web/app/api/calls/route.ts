export async function GET(req: Request) {
  const full = new URL(req.url).searchParams.get("full") ? "&full=1" : "";
  const r = await fetch(`${process.env.BACKEND_URL}/calls?key=${process.env.DOORMAN_KEY}${full}`, { cache: "no-store" });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
}
