import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";

// Public sitemap on the custom domain. Reads only public rows (RLS decides) with the publishable key.
const STATIC = ["/", "/categories", "/search", "/about", "/help", "/contact", "/privacy", "/terms"];

async function list(base: string, key: string, query: string, field: string): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${base}/rest/v1/${query}`, {
      headers: { apikey: key, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`sitemap query failed: ${res.status}`);
    const rows = (await res.json()) as Record<string, string>[];
    out.push(...rows.map((r) => r[field]));
    if (rows.length < 1000) return out;
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const base = (process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"] || "https://rvgqgtjkqmvjauqofsgt.supabase.co").replace(/\/+$/, "");
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";
        const [shops, products, cats] = await Promise.all([
          list(base, key, "shops?select=slug&status=eq.approved&is_active=eq.true", "slug"),
          list(base, key, "products?select=id&is_active=eq.true", "id"),
          list(base, key, "categories?select=slug", "slug"),
        ]);
        const paths = [...STATIC, ...cats.map((s) => `/c/${s}`), ...shops.map((s) => `/shops/${s}`), ...products.map((id) => `/p/${id}`)];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
          .map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`)
          .join("\n")}\n</urlset>\n`;
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
