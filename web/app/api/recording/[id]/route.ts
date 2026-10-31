// Recordings are Ogg/Opus. A browser can only show their length and seek in them when the
// response has a length and honours byte ranges, so the file is fetched once, kept, and served
// whole or in ranges.
const cache = new Map<string, { body: ArrayBuffer; type: string }>();

export async function GET(req: Request, ctx: RouteContext<"/api/recording/[id]">) {
  const { id } = await ctx.params;
  let hit = cache.get(id);
  if (!hit) {
    const r = await fetch(`${process.env.BACKEND_URL}/recording/${encodeURIComponent(id)}?key=${process.env.DOORMAN_KEY}`);
    if (!r.ok) return new Response("no recording yet", { status: r.status });
    hit = { body: await r.arrayBuffer(), type: r.headers.get("content-type") ?? "audio/ogg" };
    if (cache.size >= 40) cache.delete(cache.keys().next().value!); // shortcut: keeps the 40 most recently fetched, fine for a demo; use a real cache once deployed
    cache.set(id, hit);
  }
  const size = hit.body.byteLength;
  const base = { "Content-Type": hit.type, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" };

  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  if (!m) return new Response(hit.body, { headers: { ...base, "Content-Length": String(size) } });

  // "bytes=500-" from 500 on, "bytes=500-999" a slice, "bytes=-500" the last 500
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${size}` } });
  }
  return new Response(hit.body.slice(start, end + 1), {
    status: 206,
    headers: { ...base, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}` },
  });
}
