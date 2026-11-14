import { ChatInbox } from "@/components/site/chat";
import { useUnreadCounts } from "@/lib/notify";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, MessageCircle, Package, Receipt, Settings2, Eye, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { categoriesQuery, shopCategoriesQuery, townshipsQuery } from "@/lib/queries";
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
const TABS = ["orders", "chat", "products", "shop"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/merchant")({
  head: () => ({
    meta: [
      { title: "Shop dashboard · Bago Market" },
      { name: "description", content: "Open your shop, manage products and handle orders on Bago Market." },
      { property: "og:title", content: "Sell on Bago Market" },
      { property: "og:description", content: "Open a shop and reach customers across Bago Region." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    TABS.includes(s.tab as Tab) ? { tab: s.tab as Tab } : {},
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
  return <Dash s={s} />;
}

function Dash({ s }: { s: ShopRow }) {
  const { t } = useApp();
  const { tab } = Route.useSearch();
  const alerts = useUnreadCounts();
  const tiles = [
    { id: "orders" as const, label: t("merchant.orders"), sub: t("merchant.tile_orders"), icon: Receipt, n: alerts.newOrders },
    { id: "chat" as const, label: t("chat.title"), sub: t("merchant.tile_chat"), icon: MessageCircle, n: alerts.shopMessages },
    { id: "products" as const, label: t("merchant.products"), sub: t("merchant.tile_products"), icon: Package, n: 0 },
    { id: "shop" as const, label: t("merchant.shop"), sub: t("merchant.tile_shop"), icon: Settings2, n: 0 },
  ];
  const current = tiles.find((x) => x.id === tab);
  return (
    <div className="mx-auto max-w-4xl py-6">
      <div className="surface mb-5 flex flex-wrap items-center gap-4 p-5">
        <div className="size-14 shrink-0 overflow-hidden rounded-xl border bg-muted"><MediaImg path={s.logo_url} alt="" className="size-full" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("nav.my_shop")}</p>
          <h1 className="truncate font-display text-xl font-semibold md:text-2xl">{s.name}</h1>
          <div className="mt-1"><StatusBadge status={s.status} kind="shop" /></div>
        </div>
        {s.status === "approved" && (
          <Button asChild variant="outline" size="sm" className="rounded-full"><Link to="/shops/$slug" params={{ slug: s.slug }}><Eye className="size-4" />{t("merchant.view_customer")}</Link></Button>
        )}
      </div>
      {s.status === "pending" && <p className="mb-4 rounded-md bg-gold-soft p-3 text-sm text-gold-foreground">{t("merchant.pending_note")}</p>}
      {!current ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {tiles.map((x) => (
            <Link key={x.id} to="/merchant" search={{ tab: x.id }} className="surface group flex items-center gap-4 p-5 transition hover:border-primary/40 hover:shadow-soft">
              <span className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><x.icon className="size-6" />
                {x.n > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-gold-foreground">{x.n}</span>}
              </span>
              <span className="min-w-0 flex-1"><span className="block font-semibold">{x.label}</span><span className="block text-sm text-muted-foreground">{x.sub}</span></span>
              <ChevronRight className="size-5 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Link to="/merchant" search={{ tab: undefined }} className="text-sm text-muted-foreground hover:text-primary">{t("nav.my_shop")}</Link>
            <ChevronRight className="size-4 text-muted-foreground" />
            <h2 className="font-semibold">{current.label}</h2>
          </div>
          {tab === "orders" && <MerchantOrders shopId={s.id} />}
          {tab === "chat" && <ChatInbox side="shop" shopId={s.id} />}
          {tab === "products" && <MerchantProducts shop={s} />}
          {tab === "shop" && <ShopForm shop={s} />}
        </div>
      )}
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
      offers_delivery: f.offers_delivery, offers_pickup: f.offers_pickup, delivery_fee: 0,
      delivery_note: f.delivery_note || null, pickup_info: f.pickup_info || null, is_food: f.is_food,
      logo_url: f.logo[0] ?? null, cover_url: f.cover[0] ?? null,
    };
    const { error } = shop
      ? await supabase.from("shops").update(payload.name !== shop.name ? { ...payload, slug: slugify(payload.name) } : payload).eq("id", shop.id)
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
      <ShopCategories shopId={shop.id} />
      <Button onClick={() => setEditing("new")} className="mb-4">+ {t("merchant.new_product")}</Button>
      {(q.data ?? []).length === 0 ? <EmptyState text={t("product.empty")} /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {q.data!.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <MediaImg path={p.images[0]} alt={p.name} className="size-14 shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{formatMMK(p.sale_price ?? p.price, lang)} · {t("merchant.stock")}: {p.stock} · {p.is_active ? t("common.active") : t("common.inactive")}</p>
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
    shop_category_id: product?.shop_category_id ?? "",
    stock: String(product?.stock ?? 0), is_active: product?.is_active ?? true, images: product?.images ?? [],
  });
  const [busy, setBusy] = useState(false);
  const all = cats.data ?? [];
  const own = useQuery(shopCategoriesQuery(shopId));
  const save = async () => {
    if (!f.name.trim() || !f.price) { toast.error(t("checkout.required")); return; }
    setBusy(true);
    const payload = {
      name: f.name.trim(), description: f.description || null, category_id: f.category_id || null,
      shop_category_id: f.shop_category_id || null,
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
      {(own.data ?? []).length > 0 && <div className="space-y-1.5"><Label>{t("merchant.shop_category")}</Label>
        <select className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={f.shop_category_id} onChange={(e) => setF({ ...f, shop_category_id: e.target.value })}>
          <option value="">—</option>{own.data!.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></div>}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5"><Label className="text-xs">{t("merchant.price")}</Label><Input inputMode="numeric" value={f.price} onChange={num("price")} /></div>
        <div className="space-y-1.5"><Label className="text-xs">{t("merchant.sale_price")}</Label><Input inputMode="numeric" value={f.sale_price} onChange={num("sale_price")} /></div>
        <div className="space-y-1.5"><Label className="text-xs">{t("merchant.stock")}</Label><Input inputMode="numeric" value={f.stock} onChange={num("stock")} /></div>
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
  // Live sockets to the backend are blocked on many Myanmar networks; poll instead.
  useEffect(() => {
    const id = setInterval(() => qc.invalidateQueries({ queryKey: ["shop-orders", shopId] }), 10000);
    return () => clearInterval(id);
  }, [shopId, qc]);
  if ((q.data ?? []).length === 0) return <EmptyState text={t("merchant.no_orders")} />;
  return (
    <>
      <ul className="divide-y rounded-lg border bg-card">
        {q.data!.map((o) => (
          <li key={o.id}>
            <button onClick={() => setOpen(o.id)} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-muted/50">
              <div><p className="font-medium">{t("orders.number", { n: o.order_no })} · {o.recipient_name}</p>
                <p className="text-xs text-muted-foreground">{t(o.delivery_method === "delivery" ? "checkout.delivery" : "checkout.pickup")} · {new Date(o.created_at).toLocaleString()}</p></div>
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

function ShopCategories({ shopId }: { shopId: string }) {
  const { t } = useApp();
  const qc = useQueryClient();
  const q = useQuery(shopCategoriesQuery(shopId));
  const [name, setName] = useState("");
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["shop-categories", shopId] });
  const add = async () => {
    const n = name.trim(); if (!n) return;
    const { error } = await supabase.from("shop_categories").insert({ shop_id: shopId, name: n.slice(0, 60), sort: (q.data?.length ?? 0) });
    if (error) { toast.error(t("err.generic")); return; }
    setName(""); refresh();
  };
  const rename = async () => {
    if (!edit || !edit.name.trim()) return;
    const { error } = await supabase.from("shop_categories").update({ name: edit.name.trim().slice(0, 60) }).eq("id", edit.id);
    if (error) { toast.error(t("err.generic")); return; }
    setEdit(null); refresh();
  };
  const remove = async (id: string) => {
    if (!confirm(t("merchant.cat_delete_confirm"))) return;
    const { error } = await supabase.from("shop_categories").delete().eq("id", id);
    if (error) { toast.error(t("err.generic")); return; }
    refresh(); qc.invalidateQueries({ queryKey: ["my-products", shopId] });
  };
  return (
    <div className="surface mb-5 space-y-3 p-4">
      <div><p className="font-semibold">{t("merchant.my_categories")}</p><p className="text-xs text-muted-foreground">{t("merchant.my_categories_sub")}</p></div>
      <div className="flex flex-wrap gap-2">
        {(q.data ?? []).map((c) => edit?.id === c.id ? (
          <span key={c.id} className="flex items-center gap-1">
            <Input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && rename()} className="h-8 w-40" />
            <Button size="icon" variant="ghost" className="size-8" onClick={rename} aria-label={t("common.save")}><Check className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-8" onClick={() => setEdit(null)} aria-label="Cancel"><X className="size-4" /></Button>
          </span>
        ) : (
          <span key={c.id} className="flex items-center gap-1 rounded-full border bg-card py-1 pl-3 pr-1 text-sm">
            {c.name}
            <button onClick={() => setEdit({ id: c.id, name: c.name })} className="grid size-6 place-items-center rounded-full hover:bg-muted" aria-label={t("common.edit")}><Pencil className="size-3.5" /></button>
            <button onClick={() => remove(c.id)} className="grid size-6 place-items-center rounded-full text-destructive hover:bg-muted" aria-label="Delete"><Trash2 className="size-3.5" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={name} placeholder={t("merchant.cat_placeholder")} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="max-w-xs" />
        <Button variant="outline" onClick={add}><Plus className="size-4" />{t("merchant.cat_add")}</Button>
      </div>
    </div>
  );
}
