import { siteUrl } from "@/lib/site";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { categoryImage } from "@/lib/category-images";
import { useApp } from "@/lib/app-state";
import { categoriesQuery, homeProductsQuery, homeShopsQuery, promosQuery, warm } from "@/lib/queries";
import { CategoryIcon, EmptyState, ErrorBox, LoadingGrid, MediaImg, Section } from "@/components/site/bits";
import { ProductCard, ShopCard, useAddToCart } from "@/components/site/cards";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:url", content: siteUrl("/") },
      { title: "Bago Market · ပဲခူးဈေး — ပဲခူးမြို့ရဲ့ ဈေးဆိုင်စုံ" },
      { name: "description", content: "Shop groceries, food, fashion and more from local shops across Bago Region, Myanmar." },
      { property: "og:title", content: "Bago Market · ပဲခူးဈေး" },
      { property: "og:description", content: "Local shops, food and groceries across Bago Region — in Myanmar and English." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: siteUrl("/") }],
  }),
  loader: ({ context: { queryClient: qc } }) =>
    warm([qc.prefetchQuery(categoriesQuery), qc.prefetchQuery(promosQuery), qc.prefetchQuery(homeShopsQuery), qc.prefetchQuery(homeProductsQuery)]),
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
  const { t, pick, roles } = useApp();
  const navigate = useNavigate();
  // Shop owners land on their shop once per visit; "Home" afterwards shows the market.
  useEffect(() => {
    if (!roles.includes("merchant") || sessionStorage.getItem("bm-owner-landed")) return;
    sessionStorage.setItem("bm-owner-landed", "1");
    navigate({ to: "/merchant", search: {}, replace: true });
  }, [roles, navigate]);
  const { add, dialog } = useAddToCart();
  const cats = useQuery(categoriesQuery);
  const top = (cats.data ?? []).filter((c) => !c.parent_id);

  const promos = useQuery(promosQuery);
  const shops = useQuery(homeShopsQuery);
  const products = useQuery(homeProductsQuery);

  const allShops = shops.data ?? [];
  // Food section follows the shop's category, not a separate switch.
  const foodId = top.find((c) => c.slug === "food")?.id;
  const isFood = (s: (typeof allShops)[number]) => !!foodId && s.category_id === foodId;
  const featured = allShops.filter((s) => !isFood(s)).slice(0, 8);
  const food = allShops.filter(isFood).slice(0, 4);

  return (
    <>
      {dialog}
      {/* Search-led start: calm, no heavy imagery */}
      <section className="mt-4 rounded-3xl border border-border/70 bg-sage/60 px-5 py-8 md:mt-6 md:px-12 md:py-14">
        <span className="eyebrow">{t("hero.eyebrow")}</span>
        <h1 className="mt-2 max-w-[680px] font-display text-[1.5rem] font-semibold leading-[1.6] text-foreground md:text-[2.4rem]">{t("hero.title")}</h1>
        <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-muted-foreground md:text-base">{t("hero.sub")}</p>
        <form
          role="search"
          className="mt-5 flex max-w-[640px] items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-soft focus-within:border-primary"
          onSubmit={(e) => { e.preventDefault(); const q = String(new FormData(e.currentTarget).get("q") ?? "").trim(); navigate({ to: "/search", search: { q } }); }}
        >
          <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <input name="q" type="search" aria-label={t("nav.search_placeholder")} placeholder={t("nav.search_placeholder")}
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none" />
          <Button type="submit" className="h-11 shrink-0 rounded-full px-5">{t("hero.search_go")}</Button>
        </form>
        {top.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("home.quick")}</p>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
              {top.slice(0, 8).map((c) => (
                <Link key={c.id} to="/c/$slug" params={{ slug: c.slug }}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm hover:border-primary hover:text-primary">
                  <CategoryIcon name={c.icon} className="size-4 text-primary" />{pick(c.name_my, c.name_en)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <Section title={t("home.categories")} action={<SeeAll to="/categories" />}>
        {cats.isError ? <ErrorBox onRetry={() => cats.refetch()} /> : cats.isLoading ? (
          <div className="grid h-80 grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
              {top.slice(0, 3).map((c, i) => (
                <CatTile key={c.id} slug={c.slug} icon={c.icon} name={pick(c.name_my, c.name_en)}
                  className={i === 0 ? "col-span-2 aspect-[16/10] md:row-span-2 md:aspect-auto" : "aspect-square md:col-span-2 md:aspect-auto md:h-52"} big={i === 0} />
              ))}
            </div>
            {top.length > 3 && (
              <>
                <p className="eyebrow mb-3 mt-7">{t("home.more_categories")}</p>
                <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0 lg:grid-cols-9">
                  {top.slice(3).map((c) => (
                    <Link key={c.id} to="/c/$slug" params={{ slug: c.slug }} className="group zoom-img flex w-28 shrink-0 snap-start flex-col gap-2 md:w-auto">
                      <span className="lift block aspect-square overflow-hidden rounded-2xl bg-sage">
                        {categoryImage(c.slug) ? <img src={categoryImage(c.slug)!} alt="" loading="lazy" className="size-full object-cover" />
                          : <span className="grid size-full place-items-center text-primary"><CategoryIcon name={c.icon} className="size-7" /></span>}
                      </span>
                      <span className="line-clamp-2 text-center text-xs font-medium leading-relaxed group-hover:text-primary">{pick(c.name_my, c.name_en)}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Section>

      <Section title={t("home.promos")}>
        {promos.data && promos.data.length > 0 ? (
          <div className="flex snap-x gap-3 overflow-x-auto pb-1">
            {promos.data.map((p) => (
              <a key={p.id} href={p.link || "#"} className="zoom-img lift relative flex aspect-[2.2/1] rounded-2xl w-[85%] shrink-0 snap-start overflow-hidden sm:w-[48%] lg:w-[32%]">
                <MediaImg path={p.image_url} alt={pick(p.title_my, p.title_en)} className="absolute inset-0 size-full" />
                <div className="relative mt-auto w-full bg-gradient-to-t from-foreground/75 to-transparent p-4 text-primary-foreground">
                  <p className="font-semibold">{pick(p.title_my, p.title_en)}</p>
                  {(p.subtitle_my || p.subtitle_en) && <p className="text-xs opacity-90">{pick(p.subtitle_my, p.subtitle_en)}</p>}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-gold/40 bg-gold-soft p-6 sm:flex-row sm:items-center">
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

      <div className="-mx-4 bg-sage/60 px-4 md:mx-0 md:rounded-3xl md:px-8">
      <Section title={t("home.food")} action={<Link to="/c/$slug" params={{ slug: "food" }} className="text-sm font-medium text-primary hover:underline">{t("common.see_all")}</Link>}>
        {food.length === 0 ? <EmptyState text={t("shop.empty")} /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{food.map((s) => <ShopCard key={s.id} s={s} />)}</div>
        )}
      </Section>
      </div>
    </>
  );
}

function CatTile({ slug, icon, name, className, big }: { slug: string; icon: string | null; name: string; className?: string; big?: boolean }) {
  const img = categoryImage(slug);
  return (
    <Link to="/c/$slug" params={{ slug }} className={`group zoom-img lift relative block overflow-hidden rounded-2xl bg-sage ${className ?? ""}`}>
      {img ? <img src={img} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        : <span className="absolute inset-0 grid place-items-center text-primary"><CategoryIcon name={icon} className="size-10" /></span>}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent p-4 pt-12">
        <span className={`block font-semibold leading-relaxed text-primary-foreground ${big ? "text-xl md:text-2xl" : "text-sm md:text-base"}`}>{name}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-xs text-primary-foreground/80"><ArrowRight className="size-3 transition-transform group-hover:translate-x-1" /></span>
      </span>
    </Link>
  );
}
