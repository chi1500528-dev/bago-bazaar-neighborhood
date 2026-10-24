import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-main.jpg";
import heroTextile from "@/assets/hero-textile.jpg";
import heroGrocery from "@/assets/hero-grocery.jpg";
import { categoryImage } from "@/lib/category-images";
import { ShieldCheck, Store } from "lucide-react";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function SeeAll({ to }: { to: "/categories" | "/search" }) {
  const { t } = useApp();
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-primary hover:underline">
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
      <section className="relative mt-5 grid items-center gap-8 overflow-hidden rounded-3xl bg-ivory px-6 py-8 md:grid-cols-[1fr_1.05fr] md:px-12 md:py-12">
        <div className="relative z-10 flex flex-col gap-5">
          <span className="eyebrow flex items-center gap-2"><span className="h-px w-8 bg-gold" />{t("hero.eyebrow")}</span>
          <h1 className="text-3xl font-semibold leading-[1.5] md:text-[2.6rem] md:leading-[1.45]">{t("hero.title")}</h1>
          <p className="max-w-md text-base text-muted-foreground">{t("hero.sub")}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg" className="rounded-full px-7 shadow-soft"><Link to="/categories">{t("hero.shop")}</Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-primary/30 bg-transparent px-7"><Link to="/merchant">{t("hero.open")}</Link></Button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Store className="size-4 text-primary" />{t("hero.badge_local")}</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />{t("hero.badge_pay")}</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md md:max-w-none">
          <div className="relative ml-auto aspect-[4/4.4] w-[82%] overflow-hidden rounded-[2rem] shadow-lift">
            <img src={heroImg} alt="" width={1200} height={1408} className="size-full object-cover" />
          </div>
          <div className="float-slow absolute bottom-6 left-0 w-[38%] overflow-hidden rounded-2xl border-4 border-card shadow-lift">
            <img src={heroTextile} alt="" width={816} height={816} loading="lazy" className="aspect-square size-full object-cover" />
          </div>
          <div className="absolute -top-2 left-[8%] hidden w-[26%] overflow-hidden rounded-2xl border-4 border-card shadow-lift sm:block" style={{ animation: "float-slow 9s ease-in-out infinite" }}>
            <img src={heroGrocery} alt="" width={816} height={816} loading="lazy" className="aspect-square size-full object-cover" />
          </div>
        </div>
      </section>

      <Section title={t("home.categories")} action={<SeeAll to="/categories" />}>
        {cats.isError ? <ErrorBox onRetry={() => cats.refetch()} /> : cats.isLoading ? (
          <div className="flex gap-4 overflow-hidden">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="size-20 shrink-0 animate-pulse rounded-full bg-muted" />)}</div>
        ) : (
          <div className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:justify-start md:gap-6 md:overflow-visible md:px-0">
            {top.map((c) => (
              <Link key={c.id} to="/c/$slug" params={{ slug: c.slug }} className="group flex w-20 shrink-0 snap-start flex-col items-center gap-2 md:w-24">
                <span className="block size-20 overflow-hidden rounded-full border-2 border-gold/50 bg-sage p-0.5 transition-colors group-hover:border-primary md:size-24">
                  <span className="block size-full overflow-hidden rounded-full">
                    {categoryImage(c.slug) ? <img src={categoryImage(c.slug)!} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      : <span className="grid size-full place-items-center text-primary"><CategoryIcon name={c.icon} className="size-8" /></span>}
                  </span>
                </span>
                <span className="line-clamp-2 text-center text-[13px] font-medium leading-relaxed group-hover:text-primary">{pick(c.name_my, c.name_en)}</span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {promos.data && promos.data.length > 0 && (
      <Section title={t("home.promos")}>
          <div className="flex snap-x gap-3 overflow-x-auto pb-1">
            {promos.data.map((p) => (
              <a key={p.id} href={p.link || "#"} className="zoom-img lift relative flex aspect-[2.2/1] rounded-2xl w-[85%] shrink-0 snap-start overflow-hidden sm:w-[48%] lg:w-[32%]">
                <MediaImg path={p.image_url} alt={pick(p.title_my, p.title_en)} className="absolute inset-0 size-full" />
                <div className="relative mt-auto w-full bg-gradient-to-t from-foreground/75 to-transparent p-4 text-primary-foreground">
                  <p className="font-semibold">{pick(p.title_my, p.title_en)}</p>
                  {(p.subtitle_my || p.subtitle_en) && <p className="text-[13px] opacity-90">{pick(p.subtitle_my, p.subtitle_en)}</p>}
                </div>
              </a>
            ))}
          </div>
      </Section>
      )}

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

      {food.length > 0 && (
      <div className="-mx-4 bg-sage/60 px-4 md:mx-0 md:rounded-3xl md:px-8">
      <Section title={t("home.food")} action={<Link to="/c/$slug" params={{ slug: "food" }} className="text-sm font-medium text-primary hover:underline">{t("common.see_all")}</Link>}>
        {(
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{food.map((s) => <ShopCard key={s.id} s={s} />)}</div>
        )}
      </Section>
      </div>
      )}

      <Section title={t("home.near")} action={<TownshipSelect />}>
        {!township ? <p className="text-[15px] text-muted-foreground">{t("home.near_pick")}</p> : near.length === 0 ? <p className="text-[15px] text-muted-foreground">{t("shop.empty")}</p> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{near.map((s) => <ShopCard key={s.id} s={s} />)}</div>
        )}
      </Section>
    </>
  );
}

