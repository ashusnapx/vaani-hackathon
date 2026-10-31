// Proxies the backend's SSE feed so the key stays on the server.
export async function GET(req: Request) {
  const full = new URL(req.url).searchParams.get("full") ? "&full=1" : "";
  const upstream = await fetch(
    `${process.env.BACKEND_URL}/events?key=${process.env.DOORMAN_KEY}${full}`,
    { cache: "no-store" },
  );
  if (!upstream.ok || !upstream.body) {
    return new Response("backend unavailable", { status: 502 });
  }
  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
