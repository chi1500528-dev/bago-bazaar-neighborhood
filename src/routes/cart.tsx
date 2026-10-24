import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartShop } from "@/lib/queries";
import { useApp } from "@/lib/app-state";
import { cartTotals, formatMMK } from "@/lib/domain/rules";
import { EmptyState, MediaImg, StickyActionBar } from "@/components/site/bits";
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

function CartPage() {
  const { t, lang, cart, setQty, removeLine } = useApp();
  const shop = useCartShop(cart[0]?.shopId);
  if (cart.length === 0)
    return <div className="py-10"><EmptyState text={t("cart.empty")} action={<Button asChild><Link to="/categories">{t("hero.shop")}</Link></Button>} /></div>;
  const totals = cartTotals(cart, null, 0);
  return (
    <div className="grid gap-6 py-6 lg:grid-cols-[1fr_22rem]">
      <div>
        <h1 className="mb-1 text-[26px] font-semibold leading-[1.5] md:text-[30px]">{t("cart.title")}</h1>
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
                    <button className="grid size-11 place-items-center" onClick={() => setQty(l.productId, l.quantity - 1)} aria-label="-"><Minus className="size-4" /></button>
                    <span className="w-8 text-center text-sm">{l.quantity}</span>
                    <button className="grid size-11 place-items-center" onClick={() => setQty(l.productId, l.quantity + 1)} aria-label="+"><Plus className="size-4" /></button>
                  </div>
                  <button onClick={() => removeLine(l.productId)} className="flex min-h-11 items-center gap-1 px-2 text-[13px] text-muted-foreground hover:text-destructive"><Trash2 className="size-4" />{t("cart.remove")}</button>
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
        <p className="text-[13px] text-muted-foreground">{t("cart.delivery_fee_note")}</p>
        <Button asChild size="lg" className="hidden w-full md:inline-flex"><Link to="/checkout">{t("cart.checkout")}</Link></Button>
      </aside>
      <StickyActionBar>
        <span className="min-w-0 flex-1"><span className="block text-[13px] text-muted-foreground">{t("cart.subtotal")}</span><span className="text-lg font-bold text-primary">{formatMMK(totals.subtotal, lang)}</span></span>
        <Button asChild size="lg" className="h-12 shrink-0"><Link to="/checkout">{t("cart.checkout")}</Link></Button>
      </StickyActionBar>
    </div>
  );
}
