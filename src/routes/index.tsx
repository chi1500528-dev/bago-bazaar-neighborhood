import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-market.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { categoriesQuery, PRODUCT_FIELDS, SHOP_FIELDS, type Product, type Shop } from "@/lib/queries";
import { CategoryIcon, EmptyState, ErrorBox, LoadingGrid, MediaImg, Section } from "@/components/site/bits";
import { ProductCard, ShopCard, useAddToCart } from "@/components/site/cards";
import { TownshipSelect } from "@/components/site/shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bago Market · ပဲခူးဈေး — ပဲခူးမြို့ရဲ့ ဈေးဆိုင်စုံ" },
      { name: "description", content: "Shop groceries, food, fashion and more from local shops across Bago Region, Myanmar." },
      { property: "og:title", content: "Bago Market · ပဲခူးဈေး" },
      { property: "og:description", content: "Local shops, food and groceries across Bago Region — in Myanmar and English." },
    ],
  }),
  component: Home,
});

function SeeAll({ to }: { to: "/categories" | "/search" }) {
  const { t } = useApp();
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
      {t("common.see_all")} <ArrowRight className="size-3.5" />
    </Link>
  );
}

function Home() {
  const { t, pick, township } = useApp();
  const { add, dialog } = useAddToCart();
  const cats = useQuery(categoriesQuery);
  const top = (cats.data ?? []).filter((c) => !c.parent_id);

  const promos = useQuery({
    queryKey: ["promos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select("*").order("sort").limit(6);
      if (error) throw error;
      return data;
    },
  });
  const shops = useQuery({
    queryKey: ["home-shops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops").select(SHOP_FIELDS).eq("status", "approved").eq("is_active", true)
        .order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(24);
      if (error) throw error;
      return data as Shop[];
    },
  });
  const products = useQuery({
    queryKey: ["home-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select(PRODUCT_FIELDS).eq("is_active", true)
        .eq("shops.status", "approved").eq("shops.is_active", true)
        .order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const allShops = shops.data ?? [];
  const featured = allShops.filter((s) => !s.is_food).slice(0, 8);
  const food = allShops.filter((s) => s.is_food).slice(0, 4);
  const near = township ? allShops.filter((s) => s.township_id === township).slice(0, 8) : [];

  return (
    <>
      {dialog}
      {/* Hero */}
      <section className="mt-5 grid overflow-hidden rounded-xl border bg-card md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
          <span className="w-fit rounded-full bg-gold-soft px-3 py-1 text-xs font-medium text-gold-foreground">Bago Market · ပဲခူးဈေး</span>
          <h1 className="text-2xl font-bold leading-snug md:text-[2rem]">{t("hero.title")}</h1>
          <p className="text-muted-foreground">{t("hero.sub")}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="lg"><Link to="/categories">{t("hero.shop")}</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/merchant">{t("hero.open")}</Link></Button>
          </div>
        </div>
        <img src={heroImg} alt="" width={1280} height={896} className="hidden h-full max-h-80 w-full object-cover md:block" />
      </section>

      <Section title={t("home.categories")} action={<SeeAll to="/categories" />}>
        {cats.isError ? <ErrorBox onRetry={() => cats.refetch()} /> : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {(cats.isLoading ? Array.from({ length: 12 }) : top).map((c, i) =>
              c ? (
                <Link key={(c as { id: string }).id} to="/c/$slug" params={{ slug: (c as { slug: string }).slug }}
                  className="surface flex flex-col items-center gap-2 px-2 py-4 text-center transition-colors hover:border-primary/40 hover:bg-primary-soft">
                  <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
                    <CategoryIcon name={(c as { icon: string | null }).icon} className="size-5" />
                  </span>
                  <span className="line-clamp-2 text-xs font-medium leading-relaxed sm:text-sm">
                    {pick((c as { name_my: string }).name_my, (c as { name_en: string }).name_en)}
                  </span>
                </Link>
              ) : <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />,
            )}
          </div>
        )}
      </Section>

      <Section title={t("home.promos")}>
        {promos.data && promos.data.length > 0 ? (
          <div className="flex snap-x gap-3 overflow-x-auto pb-1">
            {promos.data.map((p) => (
              <a key={p.id} href={p.link || "#"} className="surface relative flex aspect-[2.2/1] w-[85%] shrink-0 snap-start overflow-hidden sm:w-[48%] lg:w-[32%]">
                <MediaImg path={p.image_url} alt={pick(p.title_my, p.title_en)} className="absolute inset-0 size-full" />
                <div className="relative mt-auto w-full bg-gradient-to-t from-foreground/75 to-transparent p-4 text-primary-foreground">
                  <p className="font-semibold">{pick(p.title_my, p.title_en)}</p>
                  {(p.subtitle_my || p.subtitle_en) && <p className="text-xs opacity-90">{pick(p.subtitle_my, p.subtitle_en)}</p>}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-gold/40 bg-gold-soft p-5 sm:flex-row sm:items-center">
            <p className="text-sm text-gold-foreground">{t("home.promos_empty")}</p>
            <Button asChild variant="outline" size="sm"><Link to="/search" search={{ q: "" }}>{t("home.featured_shops")}</Link></Button>
          </div>
        )}
      </Section>

      <Section title={t("home.featured_shops")}>
        {shops.isLoading ? <LoadingGrid /> : shops.isError ? <ErrorBox onRetry={() => shops.refetch()} /> :
          featured.length === 0 ? <EmptyState text={t("shop.empty")} action={<Button asChild size="sm"><Link to="/merchant">{t("hero.open")}</Link></Button>} /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{featured.map((s) => <ShopCard key={s.id} s={s} />)}</div>
        )}
      </Section>

      <Section title={t("home.popular")}>
        {products.isLoading ? <LoadingGrid /> : products.isError ? <ErrorBox onRetry={() => products.refetch()} /> :
          (products.data ?? []).length === 0 ? <EmptyState text={t("product.empty")} /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{products.data!.map((p) => <ProductCard key={p.id} p={p} onAdd={add} />)}</div>
        )}
      </Section>

      <Section title={t("home.food")} action={<Link to="/c/$slug" params={{ slug: "food" }} className="text-sm font-medium text-primary hover:underline">{t("common.see_all")}</Link>}>
        {food.length === 0 ? <EmptyState text={t("shop.empty")} /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{food.map((s) => <ShopCard key={s.id} s={s} />)}</div>
        )}
      </Section>

      <Section title={t("home.near")} action={<TownshipSelect />}>
        {!township ? <EmptyState text={t("home.near_pick")} /> : near.length === 0 ? <EmptyState text={t("shop.empty")} /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{near.map((s) => <ShopCard key={s.id} s={s} />)}</div>
        )}
      </Section>
    </>
  );
}
