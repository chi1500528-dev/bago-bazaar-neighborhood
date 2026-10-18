import { createFileRoute } from "@tanstack/react-router";

// Same-origin relay to Supabase so phones on networks that block *.supabase.co
// still work. It forwards the caller's own apikey/bearer, so RLS still decides access.
const ALLOWED = /^(rest|auth|storage)\/v1\//;
const DROP = ["host", "cookie", "origin", "referer", "content-length", "accept-encoding", "connection"];

async function relay({ request, params }: { request: Request; params: { _splat?: string } }) {
  const path = params._splat ?? "";
  if (!ALLOWED.test(path)) return new Response("Not found", { status: 404 });
  const base = (process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "").replace(/\/+$/, "");
  if (!base) return new Response("Backend not configured", { status: 500 });
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  for (const h of DROP) headers.delete(h);
  for (const h of [...headers.keys()]) if (h.startsWith("cf-") || h.startsWith("x-forwarded")) headers.delete(h);
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const res = await fetch(`${base}/${path}${url.search}`, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : null,
    redirect: "manual",
  });
  const out = new Headers(res.headers);
  out.delete("content-encoding");
  out.delete("content-length");
  out.delete("transfer-encoding");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

export const Route = createFileRoute("/api/public/sb/$")({
  server: {
    handlers: {
      GET: relay,
      HEAD: relay,
      POST: relay,
      PUT: relay,
      PATCH: relay,
      DELETE: relay,
    },
  },
});
