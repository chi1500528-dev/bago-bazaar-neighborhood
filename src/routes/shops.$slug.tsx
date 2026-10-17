import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, Clock, MapPin, Phone, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { PRODUCT_FIELDS, SHOP_FIELDS, type Product, type Shop } from "@/lib/queries";
import { formatMMK } from "@/lib/domain/rules";
import { EmptyState, LoadingGrid, MediaImg, Section } from "@/components/site/bits";
import { ProductCard, useAddToCart, useTownshipName } from "@/components/site/cards";

export const Route = createFileRoute("/shops/$slug")({
  head: () => ({
    meta: [
      { title: "Shop · Bago Market" },
      { name: "description", content: "A local shop on Bago Market — browse products, delivery and pickup options." },
      { property: "og:title", content: "Shop · Bago Market" },
      { property: "og:description", content: "Browse this shop's products on Bago Market." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useApp();
  const tw = useTownshipName();
  const { add, dialog } = useAddToCart();
  const shop = useQuery({
    queryKey: ["shop", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select(SHOP_FIELDS).eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as Shop | null;
    },
  });
  const products = useQuery({
    queryKey: ["shop-products", shop.data?.id],
    enabled: !!shop.data,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(PRODUCT_FIELDS)
        .eq("shop_id", shop.data!.id).eq("is_active", true).order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  if (shop.isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  const s = shop.data;
  if (!s) return <div className="py-10"><EmptyState text={t("search.none")} /></div>;

  return (
    <div className="py-5">
      {dialog}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="aspect-[3/1] max-h-64 w-full bg-muted md:aspect-[4/1]">
          <MediaImg path={s.cover_url} alt={s.name} className="size-full" eager />
        </div>
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start">
          <div className="-mt-14 size-20 shrink-0 overflow-hidden rounded-xl border-4 border-card bg-card">
            <MediaImg path={s.logo_url} alt="" className="size-full" />
          </div>
          <div className="flex-1 space-y-2">
            <h1 className="text-xl font-bold md:text-2xl">{s.name}</h1>
            {s.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{s.description}</p>}
          </div>
        </div>
        <dl className="grid gap-3 border-t p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {(s.township_id || s.address) && (
            <div className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><div><dt className="sr-only">{t("shop.address")}</dt><dd>{[s.address, tw(s.township_id)].filter(Boolean).join(", ")}</dd></div></div>
          )}
          {s.opening_hours && <div className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-primary" /><dd>{s.opening_hours}</dd></div>}
          {s.phone && <div className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-primary" /><dd><a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a></dd></div>}
          <div className="flex flex-col gap-1">
            {s.offers_delivery && <span className="flex gap-2"><Bike className="size-4 text-primary" />{t("shop.delivery")} · {t("shop.delivery_fee")} {formatMMK(s.delivery_fee, lang)}</span>}
            {s.offers_pickup && <span className="flex gap-2"><Store className="size-4 text-primary" />{t("shop.pickup")}</span>}
            {s.delivery_note && <span className="text-xs text-muted-foreground">{s.delivery_note}</span>}
          </div>
        </dl>
      </div>
      <Section title={t("shop.products")}>
        {products.isLoading ? <LoadingGrid /> : (products.data ?? []).length === 0 ? <EmptyState text={t("shop.no_products")} /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{products.data!.map((p) => <ProductCard key={p.id} p={p} onAdd={add} />)}</div>
        )}
      </Section>
    </div>
  );
}
