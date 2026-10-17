import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { cartTotals, formatMMK } from "@/lib/domain/rules";
import { EmptyState, MediaImg } from "@/components/site/bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart · Bago Market" },
      { name: "description", content: "Review the items in your Bago Market cart." },
      { property: "og:title", content: "Cart · Bago Market" },
      { property: "og:description", content: "Your shopping cart on Bago Market." },
    ],
  }),
  component: CartPage,
});

export function useCartShop(shopId: string | undefined) {
  return useQuery({
    queryKey: ["cart-shop", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("shops")
        .select("id, name, slug, offers_delivery, offers_pickup, delivery_fee, pickup_info, address, township_id, phone")
        .eq("id", shopId!).maybeSingle();
      return data;
    },
  });
}

function CartPage() {
  const { t, lang, cart, setQty, removeLine } = useApp();
  const shop = useCartShop(cart[0]?.shopId);
  if (cart.length === 0)
    return <div className="py-10"><EmptyState text={t("cart.empty")} action={<Button asChild><Link to="/categories">{t("hero.shop")}</Link></Button>} /></div>;
  const totals = cartTotals(cart, null, 0);
  return (
    <div className="grid gap-6 py-6 lg:grid-cols-[1fr_22rem]">
      <div>
        <h1 className="mb-1 text-xl font-bold">{t("cart.title")}</h1>
        {shop.data && <Link to="/shops/$slug" params={{ slug: shop.data.slug }} className="text-sm text-primary hover:underline">{shop.data.name}</Link>}
        <ul className="mt-4 divide-y rounded-lg border bg-card">
          {cart.map((l) => (
            <li key={l.productId} className="flex gap-3 p-3">
              <MediaImg path={l.image} alt={l.name} className="size-20 shrink-0 rounded-md" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Link to="/p/$id" params={{ id: l.productId }} className="line-clamp-2 text-sm font-medium">{l.name}</Link>
                <span className="text-sm text-primary">{formatMMK(l.unitPrice, lang)}</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-md border">
                    <button className="grid size-10 place-items-center" onClick={() => setQty(l.productId, l.quantity - 1)} aria-label="-"><Minus className="size-4" /></button>
                    <span className="w-8 text-center text-sm">{l.quantity}</span>
                    <button className="grid size-10 place-items-center" onClick={() => setQty(l.productId, l.quantity + 1)} aria-label="+"><Plus className="size-4" /></button>
                  </div>
                  <button onClick={() => removeLine(l.productId)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="size-4" />{t("cart.remove")}</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="surface h-fit space-y-3 p-5">
        <div className="flex justify-between text-sm"><span>{t("cart.subtotal")}</span><span className="font-medium">{formatMMK(totals.subtotal, lang)}</span></div>
        <div className="flex justify-between text-sm">
          <span>{t("cart.delivery_fee")}</span>
          <span className="text-right text-muted-foreground">{shop.data?.offers_delivery ? formatMMK(shop.data.delivery_fee, lang) : "—"}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t("cart.delivery_fee_note")}</p>
        <Button asChild size="lg" className="w-full"><Link to="/checkout">{t("cart.checkout")}</Link></Button>
      </aside>
    </div>
  );
}
