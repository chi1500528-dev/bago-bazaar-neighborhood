import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { categoriesQuery, SHOP_FIELDS, type Shop } from "@/lib/queries";
import { EmptyState, Section } from "@/components/site/bits";
import { ShopCard } from "@/components/site/cards";
import { ProductBrowser } from "@/components/site/browser";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/c/$slug")({
  head: () => ({
    meta: [
      { title: "Shop by category · Bago Market" },
      { name: "description", content: "Products and shops in this category on Bago Market." },
      { property: "og:title", content: "Shop by category · Bago Market" },
      { property: "og:description", content: "Browse products and shops by category across Bago Region." },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { t, pick } = useApp();
  const cats = useQuery(categoriesQuery);
  const all = cats.data ?? [];
  const cat = all.find((c) => c.slug === slug);
  const parent = cat?.parent_id ? all.find((c) => c.id === cat.parent_id) : cat;
  const subs = parent ? all.filter((c) => c.parent_id === parent.id) : [];
  const ids = cat ? [cat.id, ...all.filter((c) => c.parent_id === cat.id).map((c) => c.id)] : [];

  const shops = useQuery({
    queryKey: ["cat-shops", parent?.id],
    enabled: !!parent,
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select(SHOP_FIELDS)
        .eq("status", "approved").eq("is_active", true).eq("category_id", parent!.id).limit(8);
      if (error) throw error;
      return data as Shop[];
    },
  });

  if (cats.isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!cat) return <div className="py-10"><EmptyState text={t("search.none")} /></div>;

  return (
    <div className="py-6">
      <nav className="mb-2 text-xs text-muted-foreground">
        <Link to="/categories" className="hover:underline">{t("nav.categories")}</Link>
        {cat.parent_id && parent && <> / <Link to="/c/$slug" params={{ slug: parent.slug }} className="hover:underline">{pick(parent.name_my, parent.name_en)}</Link></>}
      </nav>
      <h1 className="text-xl font-bold md:text-2xl">{pick(cat.name_my, cat.name_en)}</h1>
      {subs.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {parent && (
            <Link to="/c/$slug" params={{ slug: parent.slug }} className={cn("shrink-0 rounded-full border px-3 py-1 text-sm", cat.id === parent.id ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary")}>
              {t("filter.all")}
            </Link>
          )}
          {subs.map((s) => (
            <Link key={s.id} to="/c/$slug" params={{ slug: s.slug }} className={cn("shrink-0 rounded-full border px-3 py-1 text-sm", s.id === cat.id ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary")}>
              {pick(s.name_my, s.name_en)}
            </Link>
          ))}
        </div>
      )}
      {(shops.data?.length ?? 0) > 0 && (
        <Section title={t("search.shops")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{shops.data!.map((s) => <ShopCard key={s.id} s={s} />)}</div>
        </Section>
      )}
      <Section title={t("search.products")}>
        <ProductBrowser categoryIds={ids} />
      </Section>
    </div>
  );
}
