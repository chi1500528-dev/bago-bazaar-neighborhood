import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bike, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MediaImg } from "./bits";
import { useApp } from "@/lib/app-state";
import { discountPercent, effectivePrice, formatMMK } from "@/lib/domain/rules";
import { townshipsQuery, type Product, type Shop } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function useTownshipName() {
  const { pick } = useApp();
  const { data } = useQuery(townshipsQuery);
  return (id: string | null | undefined) => {
    const tw = data?.find((x) => x.id === id);
    return tw ? pick(tw.name_my, tw.name_en) : "";
  };
}

export function useAddToCart() {
  const app = useApp();
  const [pending, setPending] = useState<Parameters<typeof app.addToCart>[0] | null>(null);
  const add = (p: Product, qty = 1) => {
    const line = {
      productId: p.id, shopId: p.shop_id, name: p.name, image: p.images[0] ?? null,
      unitPrice: effectivePrice(p), quantity: qty, stock: p.stock,
    };
    const r = app.addToCart(line);
    if (r === "ok") toast.success(app.t("product.added"));
    else if (r === "other_shop") setPending(line);
    else toast.error(app.t("product.out_of_stock"));
  };
  const dialog = (
    <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{app.t("cart.other_shop_title")}</AlertDialogTitle>
          <AlertDialogDescription>{app.t("cart.other_shop_body")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{app.t("cart.keep")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pending && app.addToCart(pending, { replace: true }) === "ok") toast.success(app.t("product.added"));
              setPending(null);
            }}
          >
            {app.t("cart.replace")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { add, dialog };
}

export function ProductCard({ p, onAdd }: { p: Product; onAdd: (p: Product) => void }) {
  const { t, lang } = useApp();
  const off = discountPercent(p);
  const out = p.stock <= 0;
  return (
    <div className="group surface flex flex-col overflow-hidden">
      <Link to="/p/$id" params={{ id: p.id }} className="relative block aspect-square overflow-hidden bg-muted">
        <MediaImg path={p.images[0]} alt={p.name} className="size-full transition-transform duration-300 group-hover:scale-[1.03]" />
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-gold px-2 py-0.5 text-xs font-semibold text-gold-foreground">
            -{off}%
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link to="/p/$id" params={{ id: p.id }} className="line-clamp-2 text-sm font-medium hover:text-primary">
          {p.name}
        </Link>
        <Link to="/shops/$slug" params={{ slug: p.shops.slug }} className="truncate text-xs text-muted-foreground hover:underline">
          {p.shops.name}
        </Link>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
          <span className="font-semibold text-primary">{formatMMK(effectivePrice(p), lang)}</span>
          {off > 0 && <span className="text-xs text-muted-foreground line-through">{formatMMK(p.price, lang)}</span>}
        </div>
        <Button size="sm" variant={out ? "secondary" : "default"} disabled={out} onClick={() => onAdd(p)} className="mt-2 h-auto min-h-8 whitespace-normal py-1.5">
          {out ? t("product.out_of_stock") : t("product.add_to_cart")}
        </Button>
      </div>
    </div>
  );
}

export function ShopCard({ s }: { s: Shop }) {
  const { t } = useApp();
  const tw = useTownshipName();
  return (
    <Link to="/shops/$slug" params={{ slug: s.slug }} className="surface group flex flex-col overflow-hidden transition-colors hover:border-primary/40">
      <div className="relative aspect-[16/9] bg-muted">
        <MediaImg path={s.cover_url} alt={s.name} className="size-full" />
        <div className="absolute -bottom-6 left-3 size-12 overflow-hidden rounded-lg border-2 border-card bg-card">
          <MediaImg path={s.logo_url} alt="" className="size-full" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-8">
        <h3 className="line-clamp-1 font-semibold group-hover:text-primary">{s.name}</h3>
        {s.township_id && <p className="text-xs text-muted-foreground">{tw(s.township_id)}</p>}
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
          {s.offers_delivery && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-primary">
              <Bike className="size-3" />{t("shop.delivery")}
            </span>
          )}
          {s.offers_pickup && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
              <Store className="size-3" />{t("shop.pickup")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
