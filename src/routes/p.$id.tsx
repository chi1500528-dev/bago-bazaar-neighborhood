import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { PRODUCT_FIELDS, type Product } from "@/lib/queries";
import { discountPercent, effectivePrice, formatMMK } from "@/lib/domain/rules";
import { EmptyState, MediaImg, StickyActionBar } from "@/components/site/bits";
import { useAddToCart } from "@/components/site/cards";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p/$id")({
  head: () => ({
    meta: [
      { title: "Product · Bago Market" },
      { name: "description", content: "Product details, price and availability on Bago Market." },
      { property: "og:title", content: "Product · Bago Market" },
      { property: "og:description", content: "See price, stock and the shop selling this product." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { t, lang } = useApp();
  const { add, dialog } = useAddToCart();
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const q = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(PRODUCT_FIELDS).eq("id", id).eq("is_active", true).maybeSingle();
      if (error) throw error;
      return data as unknown as Product | null;
    },
  });
  if (q.isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  const p = q.data;
  if (!p) return <div className="py-10"><EmptyState text={t("product.not_found")} /></div>;
  const off = discountPercent(p);
  const out = p.stock <= 0;

  return (
    <div className="grid gap-6 py-6 md:grid-cols-2 md:gap-10">
      {dialog}
      <div className="space-y-3">
        <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
          <MediaImg path={p.images[img]} alt={p.name} className="size-full" eager />
        </div>
        {p.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {p.images.map((im, i) => (
              <button key={im} onClick={() => setImg(i)} className={cn("size-16 shrink-0 overflow-hidden rounded-md border-2", i === img ? "border-primary" : "border-transparent")}>
                <MediaImg path={im} alt="" className="size-full" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-4">
        <h1 className="break-words text-xl font-bold md:text-2xl">{p.name}</h1>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-bold text-primary">{formatMMK(effectivePrice(p), lang)}</span>
          {off > 0 && <><span className="text-muted-foreground line-through">{formatMMK(p.price, lang)}</span><span className="rounded bg-gold px-2 py-0.5 text-[13px] font-semibold text-gold-foreground">-{off}%</span></>}
        </div>
        <p className={cn("text-sm font-medium", out ? "text-destructive" : p.stock <= 5 ? "text-warning" : "text-success")}>
          {out ? t("product.out_of_stock") : p.stock <= 5 ? t("product.low_stock", { n: p.stock }) : t("product.in_stock")}
        </p>
        <Link to="/shops/$slug" params={{ slug: p.shops.slug }} className="surface flex items-center gap-3 p-3 hover:border-primary/40">
          <Store className="size-5 text-primary" />
          <div className="text-sm"><span className="text-muted-foreground">{t("product.sold_by")}: </span><span className="font-medium">{p.shops.name}</span></div>
        </Link>
        {!out && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">{t("product.quantity")}</span>
            <div className="flex items-center rounded-md border">
              <button className="grid size-11 place-items-center" onClick={() => setQty((x) => Math.max(1, x - 1))} aria-label="-"><Minus className="size-4" /></button>
              <span className="w-10 text-center font-medium">{qty}</span>
              <button className="grid size-11 place-items-center" onClick={() => setQty((x) => Math.min(p.stock, x + 1))} aria-label="+"><Plus className="size-4" /></button>
            </div>
          </div>
        )}
        <Button size="lg" className="hidden md:inline-flex" disabled={out} onClick={() => add(p, qty)}>
          {out ? t("product.out_of_stock") : t("product.add_to_cart")}
        </Button>
        {p.description && <p className="whitespace-pre-line break-words border-t pt-4 text-sm leading-relaxed">{p.description}</p>}
      </div>
      <StickyActionBar>
        <span className="min-w-0 flex-1 truncate text-lg font-bold text-primary">{formatMMK(effectivePrice(p) * (out ? 1 : qty), lang)}</span>
        <Button size="lg" className="h-12 shrink-0" disabled={out} onClick={() => add(p, qty)}>
          {out ? t("product.out_of_stock") : t("product.add_to_cart")}
        </Button>
      </StickyActionBar>
    </div>
  );
}
