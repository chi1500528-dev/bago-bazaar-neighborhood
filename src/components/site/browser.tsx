import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { PRODUCT_FIELDS, townshipsQuery, type Product } from "@/lib/queries";
import { EmptyState, ErrorBox, LoadingGrid } from "./bits";
import { ProductCard, useAddToCart } from "./cards";
import { Button } from "@/components/ui/button";

const PAGE = 12;
type Sort = "relevance" | "newest" | "price_asc" | "price_desc";

function escapeLike(s: string) {
  return s.replace(/[%_,()]/g, " ");
}

export function ProductBrowser({ categoryIds, q }: { categoryIds?: string[]; q?: string }) {
  const app = useApp();
  const { t, pick } = app;
  const { add, dialog } = useAddToCart();
  const townships = useQuery(townshipsQuery);
  const [sort, setSort] = useState<Sort>("relevance");
  const [tw, setTw] = useState<string>(app.township ?? "");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [inStock, setInStock] = useState(false);
  const [method, setMethod] = useState<"" | "delivery" | "pickup">("");

  const query = useInfiniteQuery({
    queryKey: ["browse", categoryIds, q, sort, tw, min, max, inStock, method],
    initialPageParam: 0,
    getNextPageParam: (last: Product[], pages) => (last.length === PAGE ? pages.length : undefined),
    queryFn: async ({ pageParam }) => {
      let b = supabase.from("products").select(PRODUCT_FIELDS)
        .eq("is_active", true).eq("shops.status", "approved").eq("shops.is_active", true);
      if (categoryIds?.length) b = b.in("category_id", categoryIds);
      if (q) b = b.or(`name.ilike.%${escapeLike(q)}%,description.ilike.%${escapeLike(q)}%`);
      if (tw) b = b.eq("shops.township_id", tw);
      if (min) b = b.gte("price", Number(min));
      if (max) b = b.lte("price", Number(max));
      if (inStock) b = b.gt("stock", 0);
      if (method === "delivery") b = b.eq("shops.offers_delivery", true);
      if (method === "pickup") b = b.eq("shops.offers_pickup", true);
      if (sort === "price_asc") b = b.order("price", { ascending: true });
      else if (sort === "price_desc") b = b.order("price", { ascending: false });
      else b = b.order("created_at", { ascending: false });
      const { data, error } = await b.range(pageParam * PAGE, pageParam * PAGE + PAGE - 1);
      if (error) throw error;
      return data as unknown as Product[];
    },
  });
  const items = query.data?.pages.flat() ?? [];
  const sel = "h-9 rounded-md border bg-card px-2 text-sm";

  return (
    <div>
      {dialog}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className={sel} value={tw} onChange={(e) => setTw(e.target.value)} aria-label={t("nav.township")}>
          <option value="">{t("nav.all_townships")}</option>
          {townships.data?.map((x) => <option key={x.id} value={x.id}>{pick(x.name_my, x.name_en)}</option>)}
        </select>
        <select className={sel} value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
          <option value="">{t("filter.all")}</option>
          <option value="delivery">{t("shop.delivery")}</option>
          <option value="pickup">{t("shop.pickup")}</option>
        </select>
        <input className={`${sel} w-24`} inputMode="numeric" placeholder={t("filter.min")} value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} />
        <input className={`${sel} w-24`} inputMode="numeric" placeholder={t("filter.max")} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="accent-[var(--primary)]" />
          {t("filter.in_stock")}
        </label>
        <select className={`${sel} ml-auto`} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t("filter.sort")}>
          <option value="relevance">{t("filter.relevance")}</option>
          <option value="newest">{t("filter.newest")}</option>
          <option value="price_asc">{t("filter.price_asc")}</option>
          <option value="price_desc">{t("filter.price_desc")}</option>
        </select>
      </div>
      {query.isLoading ? <LoadingGrid n={8} /> : query.isError ? <ErrorBox onRetry={() => query.refetch()} /> :
        items.length === 0 ? <EmptyState text={t("search.none")} /> : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => <ProductCard key={p.id} p={p} onAdd={add} />)}
            </div>
            {query.hasNextPage && (
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                  {query.isFetchingNextPage ? t("common.loading") : t("common.more")}
                </Button>
              </div>
            )}
          </>
        )}
    </div>
  );
}
