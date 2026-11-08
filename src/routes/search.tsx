import { siteUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { categoriesQuery, SHOP_FIELDS, type Shop } from "@/lib/queries";
import { Section } from "@/components/site/bits";
import { ShopCard } from "@/components/site/cards";
import { ProductBrowser } from "@/components/site/browser";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().optional().catch("") }),
  head: () => ({
    meta: [
      { property: "og:url", content: siteUrl("/search") },
      { title: "Search · Bago Market" },
      { name: "description", content: "Search products and shops on Bago Market in Myanmar or English." },
      { property: "og:title", content: "Search · Bago Market" },
      { property: "og:description", content: "Find products, shops and categories across Bago Region." },
    ],
    links: [{ rel: "canonical", href: siteUrl("/search") }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { t, pick } = useApp();
  const [input, setInput] = useState(q);
  useEffect(() => setInput(q), [q]);
  useEffect(() => {
    const id = setTimeout(() => {
      if (input.trim() !== q) navigate({ search: { q: input.trim() }, replace: true });
    }, 350);
    return () => clearTimeout(id);
  }, [input, q, navigate]);

  const term = q.replace(/[%_,()]/g, " ");
  const shops = useQuery({
    queryKey: ["search-shops", q],
    queryFn: async () => {
      let b = supabase.from("shops").select(SHOP_FIELDS).eq("status", "approved").eq("is_active", true);
      if (term) b = b.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
      const { data, error } = await b.order("is_featured", { ascending: false }).limit(8);
      if (error) throw error;
      return data as Shop[];
    },
  });
  const cats = useQuery(categoriesQuery);
  const lower = q.toLowerCase();
  const matchedCats = q ? (cats.data ?? []).filter((c) => c.name_my.includes(q) || c.name_en.toLowerCase().includes(lower)) : [];

  return (
    <div className="py-6">
      <h1 className="mb-3 text-xl font-bold">{t("search.title")}</h1>
      <input
        autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("nav.search_placeholder")}
        className="h-11 w-full rounded-lg border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      {matchedCats.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {matchedCats.map((c) => (
            <Link key={c.id} to="/c/$slug" params={{ slug: c.slug }} className="rounded-full bg-primary-soft px-3 py-1 text-sm text-primary">{pick(c.name_my, c.name_en)}</Link>
          ))}
        </div>
      )}
      {(shops.data?.length ?? 0) > 0 && (
        <Section title={t("search.shops")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{shops.data!.map((s) => <ShopCard key={s.id} s={s} />)}</div>
        </Section>
      )}
      <Section title={t("search.products")}>
        <ProductBrowser q={q} />
      </Section>
    </div>
  );
}
