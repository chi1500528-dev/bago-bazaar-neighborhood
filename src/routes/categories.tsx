import { siteUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import { categoriesQuery } from "@/lib/queries";
import { CategoryIcon, ErrorBox } from "@/components/site/bits";
import { categoryImage } from "@/lib/category-images";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { property: "og:url", content: siteUrl("/categories") },
      { title: "Categories · Bago Market" },
      { name: "description", content: "Browse all product categories on Bago Market." },
      { property: "og:title", content: "Categories · Bago Market" },
      { property: "og:description", content: "Food, groceries, fashion, electronics and more from Bago shops." },
    ],
    links: [{ rel: "canonical", href: siteUrl("/categories") }],
  }),
  component: Categories,
});

function Categories() {
  const { t, pick } = useApp();
  const q = useQuery(categoriesQuery);
  if (q.isError) return <div className="py-8"><ErrorBox onRetry={() => q.refetch()} /></div>;
  const all = q.data ?? [];
  const top = all.filter((c) => !c.parent_id);
  return (
    <div className="py-6">
      <h1 className="mb-5 text-xl font-bold">{t("nav.categories")}</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {top.map((c) => {
          const subs = all.filter((s) => s.parent_id === c.id);
          return (
            <div key={c.id} className="lift rounded-2xl bg-card p-4">
              <Link to="/c/$slug" params={{ slug: c.slug }} className="zoom-img flex items-center gap-3 hover:text-primary">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-sage text-primary">
                  {categoryImage(c.slug) ? <img src={categoryImage(c.slug)!} alt="" loading="lazy" className="size-full object-cover" /> : <CategoryIcon name={c.icon} className="size-5" />}
                </span>
                <span className="font-semibold">{pick(c.name_my, c.name_en)}</span>
              </Link>
              {subs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {subs.map((s) => (
                    <Link key={s.id} to="/c/$slug" params={{ slug: s.slug }} className="rounded-full border px-2.5 py-0.5 text-xs hover:border-primary hover:text-primary">
                      {pick(s.name_my, s.name_en)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
