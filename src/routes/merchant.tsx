import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { categoriesQuery, townshipsQuery } from "@/lib/queries";
import { formatMMK, slugify } from "@/lib/domain/rules";
import { MediaImg, StatusBadge, EmptyState } from "@/components/site/bits";
import { RequireAuth } from "@/components/site/shell";
import { ImageField } from "@/components/site/upload";
import { OrderDetail } from "@/components/site/order-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type ShopRow = Database["public"]["Tables"]["shops"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];

export const Route = createFileRoute("/merchant")({
  head: () => ({
    meta: [
      { title: "Shop dashboard · Bago Market" },
      { name: "description", content: "Open your shop, manage products and handle orders on Bago Market." },
      { property: "og:title", content: "Sell on Bago Market" },
      { property: "og:description", content: "Open a shop and reach customers across Bago Region." },
    ],
  }),
  component: () => <RequireAuth><Merchant /></RequireAuth>,
});

function Merchant() {
  const { t, session } = useApp();
  const shop = useQuery({
    queryKey: ["my-shop", session!.user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("*").eq("owner_id", session!.user.id).order("created_at").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (shop.isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!shop.data)
    return (
      <div className="mx-auto max-w-2xl py-6">
        <h1 className="text-xl font-bold">{t("merchant.create")}</h1>
        <p className="mb-5 text-sm text-muted-foreground">{t("merchant.create_sub")}</p>
        <ShopForm />
      </div>
    );
  const s = shop.data;
  return (
    <div className="py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">{s.name}</h1>
        <StatusBadge status={s.status} kind="shop" />
        {s.status === "approved" && <Link to="/shops/$slug" params={{ slug: s.slug }} className="text-sm text-primary hover:underline">{t("shop.visit")} →</Link>}
      </div>
      {s.status === "pending" && <p className="mb-4 rounded-md bg-gold-soft p-3 text-sm text-gold-foreground">{t("merchant.pending_note")}</p>}
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">{t("merchant.orders")}</TabsTrigger>
          <TabsTrigger value="products">{t("merchant.products")}</TabsTrigger>
          <TabsTrigger value="shop">{t("merchant.shop")}</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="pt-4"><MerchantOrders shopId={s.id} /></TabsContent>
        <TabsContent value="products" className="pt-4"><MerchantProducts shop={s} /></TabsContent>
        <TabsContent value="shop" className="pt-4"><ShopForm shop={s} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ShopForm({ shop }: { shop?: ShopRow }) {
  const { t, pick, session } = useApp();
  const qc = useQueryClient();
  const cats = useQuery(categoriesQuery);
  const towns = useQuery(townshipsQuery);
  const [f, setF] = useState({
    name: shop?.name ?? "", description: shop?.description ?? "", category_id: shop?.category_id ?? "",
    township_id: shop?.township_id ?? "", address: shop?.address ?? "", phone: shop?.phone ?? "",
    opening_hours: shop?.opening_hours ?? "", offers_delivery: shop?.offers_delivery ?? true, offers_pickup: shop?.offers_pickup ?? true,
    delivery_fee: String(shop?.delivery_fee ?? 0), delivery_note: shop?.delivery_note ?? "", pickup_info: shop?.pickup_info ?? "",
    is_food: shop?.is_food ?? false, logo: shop?.logo_url ? [shop.logo_url] : [], cover: shop?.cover_url ? [shop.cover_url] : [],
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.name.trim()) { toast.error(`${t("merchant.shop_name")}: ${t("checkout.required")}`); return; }
    if (!f.offers_delivery && !f.offers_pickup) { toast.error(t("err.METHOD_UNAVAILABLE")); return; }
    setBusy(true);
    const payload = {
      name: f.name.trim(), description: f.description || null, category_id: f.category_id || null, township_id: f.township_id || null,
      address: f.address || null, phone: f.phone || null, opening_hours: f.opening_hours || null,
      offers_delivery: f.offers_delivery, offers_pickup: f.offers_pickup, delivery_fee: Math.max(0, Number(f.delivery_fee) || 0),
      delivery_note: f.delivery_note || null, pickup_info: f.pickup_info || null, is_food: f.is_food,
      logo_url: f.logo[0] ?? null, cover_url: f.cover[0] ?? null,
    };
    const { error } = shop
      ? await supabase.from("shops").update(payload).eq("id", shop.id)
      : await supabase.from("shops").insert({ ...payload, owner_id: session!.user.id, slug: slugify(f.name) });
    setBusy(false);
    if (error) { toast.error(t("err.generic")); return; }
    toast.success(t("account.saved"));
    qc.invalidateQueries();
  };
  const top = (cats.data ?? []).filter((c) => !c.parent_id);
  const sel = "h-9 w-full rounded-md border bg-card px-2 text-sm";
  return (
    <div className="surface grid gap-4 p-5 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2"><Label>{t("merchant.shop_name")}</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label>{t("merchant.description")}</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>{t("merchant.category")}</Label>
        <select className={sel} value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value, is_food: f.is_food || top.find((c) => c.id === e.target.value)?.slug === "food" })}>
          <option value="">—</option>{top.map((c) => <option key={c.id} value={c.id}>{pick(c.name_my, c.name_en)}</option>)}
        </select></div>
      <div className="space-y-1.5"><Label>{t("nav.township")}</Label>
        <select className={sel} value={f.township_id} onChange={(e) => setF({ ...f, township_id: e.target.value })}>
          <option value="">—</option>{towns.data?.map((c) => <option key={c.id} value={c.id}>{pick(c.name_my, c.name_en)}</option>)}
        </select></div>
      <div className="space-y-1.5"><Label>{t("shop.address")}</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>{t("shop.phone")}</Label><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label>{t("shop.hours")}</Label><Input placeholder="8:00 – 20:00" value={f.opening_hours} onChange={(e) => setF({ ...f, opening_hours: e.target.value })} /></div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={f.offers_delivery} onCheckedChange={(v) => setF({ ...f, offers_delivery: v })} />{t("shop.delivery")}</label>
      <label className="flex items-center gap-2 text-sm"><Switch checked={f.offers_pickup} onCheckedChange={(v) => setF({ ...f, offers_pickup: v })} />{t("shop.pickup")}</label>
      {f.offers_delivery && <>
        <div className="space-y-1.5"><Label>{t("shop.delivery_fee")} (MMK)</Label><Input inputMode="numeric" value={f.delivery_fee} onChange={(e) => setF({ ...f, delivery_fee: e.target.value.replace(/\D/g, "") })} /></div>
        <div className="space-y-1.5"><Label>{t("merchant.delivery_note")}</Label><Input value={f.delivery_note} onChange={(e) => setF({ ...f, delivery_note: e.target.value })} /></div>
      </>}
      {f.offers_pickup && <div className="space-y-1.5 sm:col-span-2"><Label>{t("merchant.pickup_info")}</Label><Input value={f.pickup_info} onChange={(e) => setF({ ...f, pickup_info: e.target.value })} /></div>}
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={f.is_food} onCheckedChange={(v) => setF({ ...f, is_food: v })} />{t("merchant.is_food")}</label>
      <ImageField label={t("merchant.logo")} value={f.logo} onChange={(v) => setF({ ...f, logo: v })} />
      <ImageField label={t("merchant.cover")} value={f.cover} onChange={(v) => setF({ ...f, cover: v })} />
      <div className="sm:col-span-2"><Button onClick={save} disabled={busy}>{busy ? t("common.loading") : shop ? t("common.save") : t("merchant.create")}</Button></div>
    </div>
  );
}

function MerchantProducts({ shop }: { shop: ShopRow }) {
  const { t, lang } = useApp();
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const q = useQuery({
    queryKey: ["my-products", shop.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div>
      <Button onClick={() => setEditing("new")} className="mb-4">+ {t("merchant.new_product")}</Button>
      {(q.data ?? []).length === 0 ? <EmptyState text={t("product.empty")} /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {q.data!.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <MediaImg path={p.images[0]} alt={p.name} className="size-14 shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium">{p.name}</p>
                <p className="text-[13px] text-muted-foreground">{formatMMK(p.sale_price ?? p.price, lang)} · {t("merchant.stock")}: {p.stock} · {p.is_active ? t("common.active") : t("common.inactive")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(p)}>{t("common.edit")}</Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing === "new" ? t("merchant.new_product") : t("common.edit")}</DialogTitle></DialogHeader>
          {editing && <ProductForm shopId={shop.id} product={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductForm({ shopId, product, onDone }: { shopId: string; product?: ProductRow | undefined; onDone: () => void }) {
  const { t, pick } = useApp();
  const qc = useQueryClient();
  const cats = useQuery(categoriesQuery);
  const [f, setF] = useState({
    name: product?.name ?? "", description: product?.description ?? "", category_id: product?.category_id ?? "",
    price: String(product?.price ?? ""), sale_price: product?.sale_price != null ? String(product.sale_price) : "",
    stock: String(product?.stock ?? 0), is_active: product?.is_active ?? true, images: product?.images ?? [],
  });
  const [busy, setBusy] = useState(false);
  const all = cats.data ?? [];
  const save = async () => {
    if (!f.name.trim() || !f.price) { toast.error(t("checkout.required")); return; }
    setBusy(true);
    const payload = {
      name: f.name.trim(), description: f.description || null, category_id: f.category_id || null,
      price: Number(f.price), sale_price: f.sale_price ? Number(f.sale_price) : null, stock: Number(f.stock) || 0,
      is_active: f.is_active, images: f.images,
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert({ ...payload, shop_id: shopId });
    setBusy(false);
    if (error) { toast.error(t("err.generic")); return; }
    qc.invalidateQueries();
    onDone();
  };
  const num = (k: "price" | "sale_price" | "stock") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value.replace(/\D/g, "") });
  return (
    <div className="space-y-3">
      <div className="space-y-1.5"><Label>{t("merchant.product_name")}</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>{t("merchant.description")}</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>{t("merchant.category")}</Label>
        <select className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
          <option value="">—</option>
          {all.filter((c) => !c.parent_id).map((c) => [
            <option key={c.id} value={c.id}>{pick(c.name_my, c.name_en)}</option>,
            ...all.filter((s) => s.parent_id === c.id).map((s) => <option key={s.id} value={s.id}>— {pick(s.name_my, s.name_en)}</option>),
          ])}
        </select></div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5"><Label className="text-[13px]">{t("merchant.price")}</Label><Input inputMode="numeric" value={f.price} onChange={num("price")} /></div>
        <div className="space-y-1.5"><Label className="text-[13px]">{t("merchant.sale_price")}</Label><Input inputMode="numeric" value={f.sale_price} onChange={num("sale_price")} /></div>
        <div className="space-y-1.5"><Label className="text-[13px]">{t("merchant.stock")}</Label><Input inputMode="numeric" value={f.stock} onChange={num("stock")} /></div>
      </div>
      <ImageField multiple label={t("merchant.images")} value={f.images} onChange={(v) => setF({ ...f, images: v })} />
      <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />{f.is_active ? t("common.active") : t("common.inactive")}</label>
      <Button onClick={save} disabled={busy} className="w-full">{t("common.save")}</Button>
    </div>
  );
}

function MerchantOrders({ shopId }: { shopId: string }) {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["shop-orders", shopId],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, order_no, status, total, delivery_method, recipient_name, created_at")
        .eq("shop_id", shopId).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const ch = supabase.channel(`shop-orders-${shopId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `shop_id=eq.${shopId}` }, () => qc.invalidateQueries({ queryKey: ["shop-orders", shopId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shopId, qc]);
  if ((q.data ?? []).length === 0) return <EmptyState text={t("merchant.no_orders")} />;
  return (
    <>
      <ul className="divide-y rounded-lg border bg-card">
        {q.data!.map((o) => (
          <li key={o.id}>
            <button onClick={() => setOpen(o.id)} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-muted/50">
              <div><p className="font-medium">{t("orders.number", { n: o.order_no })} · {o.recipient_name}</p>
                <p className="text-[13px] text-muted-foreground">{t(o.delivery_method === "delivery" ? "checkout.delivery" : "checkout.pickup")} · {new Date(o.created_at).toLocaleString()}</p></div>
              <div className="flex items-center gap-3"><span className="text-sm font-medium">{formatMMK(o.total, lang)}</span><StatusBadge status={o.status} /></div>
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle className="sr-only">Order</DialogTitle></DialogHeader>
          {open && <OrderDetail id={open} as="merchant" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
