import { ChatInbox } from "@/components/site/chat";
import { useUnreadCounts } from "@/lib/notify";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, MessageCircle, Package, Receipt, Settings2, Eye, Store, Plus, Pencil, Trash2, Check, X, AlertTriangle, ShoppingBag, BarChart3 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { categoriesQuery, shopCategoriesQuery, townshipsQuery } from "@/lib/queries";
import { formatMMK, slugify, isLowStock, LOW_STOCK_AT, ORDER_FILTERS, lowStockList, type OrderFilter } from "@/lib/domain/rules";
import { presetRange, rangeBounds } from "@/lib/domain/reports";
import { pos } from "@/lib/pos";
import { reports } from "@/lib/reports";
import { MediaImg, StatusBadge, EmptyState } from "@/components/site/bits";
import { RequireAuth } from "@/components/site/shell";
import { ImageField } from "@/components/site/upload";
import { CsvImport, ImportHistory, TemplatePicker } from "@/components/site/product-import";
import { validateProduct, draftDescription, applyDraft, type DescDetails, type DraftLang } from "@/lib/domain/products";
import type { TKey } from "@/lib/i18n/dict";
import { OrderDetail } from "@/components/site/order-detail";
import { PosSell, StockHistory } from "@/components/site/pos";
import { MerchantReports } from "@/components/site/reports";
import { ReceiptSettingsCard } from "@/components/site/receipt-settings";
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
const TABS = ["sell", "orders", "chat", "products", "reports", "shop"] as const;
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
  validateSearch: (s: Record<string, unknown>): { tab?: Tab; low?: boolean } => ({
    ...(TABS.includes(s["tab"] as Tab) ? { tab: s["tab"] as Tab } : {}),
    ...(s["low"] === true || s["low"] === "1" || s["low"] === 1 ? { low: true } : {}),
  }),
  component: () => <RequireAuth><Merchant /></RequireAuth>,
});

function Merchant() {
  const { t, session } = useApp();
  const uid = session!.user.id;
  const shops = useQuery({
    queryKey: ["my-shops", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("*").eq("owner_id", uid).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [picked, setPicked] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => { setPicked(localStorage.getItem(`bm.shop.${uid}`)); }, [uid]);
  const pick = (id: string) => { setPicked(id); setCreating(false); localStorage.setItem(`bm.shop.${uid}`, id); };
  if (shops.isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  const list = shops.data ?? [];
  if (list.length === 0 || creating)
    return (
      <div className="mx-auto max-w-2xl py-6">
        {creating && <button onClick={() => setCreating(false)} className="mb-3 text-sm text-muted-foreground hover:text-primary">← {t("nav.my_shop")}</button>}
        <h1 className="text-xl font-bold">{t("merchant.create")}</h1>
        <p className="mb-5 text-sm text-muted-foreground">{t("merchant.create_sub")}</p>
        <ShopForm onCreated={(id) => pick(id)} />
      </div>
    );
  const s = list.find((x) => x.id === picked) ?? list[0]!;
  return <Dash s={s} shops={list} onPick={pick} onNew={() => setCreating(true)} />;
}

function ShopSwitcher({ s, shops, onPick, onNew }: { s: ShopRow; shops: ShopRow[]; onPick: (id: string) => void; onNew: () => void }) {
  const { t } = useApp();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("merchant.switch_shop")}</span>
      {shops.map((x) => (
        <button key={x.id} onClick={() => onPick(x.id)} aria-pressed={x.id === s.id}
          className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition ${x.id === s.id ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card hover:border-primary/40"}`}>
          <span className="size-6 overflow-hidden rounded-full bg-muted"><MediaImg path={x.logo_url} alt="" className="size-full" /></span>{x.name}
        </button>
      ))}
      <button onClick={onNew} className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground hover:text-primary"><Plus className="size-3.5" />{t("merchant.new_shop")}</button>
    </div>
  );
}

function TodaySummary({ shopId, unread }: { shopId: string; unread: number }) {
  const { t } = useApp();
  const q = useQuery({
    queryKey: ["shop-today", shopId],
    refetchInterval: 30000,
    queryFn: async () => {
      const { from, to } = rangeBounds(presetRange("today"));
      const [today, pending, prods] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).neq("status", "cancelled")
          .gte("created_at", from.toISOString()).lt("created_at", to.toISOString()),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "pending"),
        supabase.from("products").select("stock, is_active").eq("shop_id", shopId).eq("is_active", true).lte("stock", LOW_STOCK_AT),
      ]);
      return { today: today.count ?? 0, pending: pending.count ?? 0, low: (prods.data ?? []).filter(isLowStock).length };
    },
  });
  const d = q.data;
  const money = useQuery({
    queryKey: ["shop-today-money", shopId],
    refetchInterval: 60000,
    queryFn: async () => {
      const [p, o] = await Promise.all([pos.day(shopId), reports.orders(shopId, presetRange("today"))]);
      return { pos: p.error ? null : p.data, online: o.error ? null : o.data };
    },
  });
  const { lang } = useApp();
  const m = money.data;
  const cards = [
    { label: t("merchant.today_orders"), n: d?.today, tab: "orders" as const, icon: Receipt },
    { label: t("merchant.pending_orders"), n: d?.pending, tab: "orders" as const, icon: Receipt, hot: (d?.pending ?? 0) > 0 },
    { label: t("merchant.unread"), n: unread, tab: "chat" as const, icon: MessageCircle, hot: unread > 0 },
    { label: t("merchant.low_stock"), sub: t("merchant.low_stock_hint"), n: d?.low, tab: "products" as const, low: true, icon: AlertTriangle, hot: (d?.low ?? 0) > 0 },
  ];
  const mmk = (n: number | undefined) => (n == null ? "–" : formatMMK(n, lang));
  return (
    <section className="mb-5" aria-label={t("merchant.today")}>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{t("merchant.today")}</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to="/merchant" search={{ tab: c.tab, ...("low" in c ? { low: true } : {}) }} className={`surface p-3 transition hover:border-primary/40 ${c.hot ? "border-gold/60 bg-gold-soft/40" : ""}`}>
            <c.icon className="mb-1 size-4 text-primary" />
            <p className="text-2xl font-semibold tabular-nums">{c.n ?? "–"}</p>
            <p className="text-xs leading-tight text-muted-foreground">{c.label}{c.sub && <span className="block opacity-80">{c.sub}</span>}</p>
          </Link>
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Link to="/merchant" search={{ tab: "reports" }} className="surface p-4 transition hover:border-primary/40">
          <p className="text-xs font-medium text-muted-foreground">{t("merchant.instore_today")}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{mmk(m?.pos?.revenue)}</p>
          <p className="text-xs text-muted-foreground">{t("rep.pos_total")} · {t("rep.tickets", { n: m?.pos?.count ?? 0 })}{(m?.pos?.voided ?? 0) > 0 ? ` · ${t("rep.voided_count")}: ${m!.pos!.voided}` : ""}</p>
        </Link>
        <Link to="/merchant" search={{ tab: "reports" }} className="surface p-4 transition hover:border-primary/40">
          <p className="text-xs font-medium text-muted-foreground">{t("merchant.online_today")}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{mmk(m?.online?.merchandise_subtotal)}</p>
          <p className="text-xs text-muted-foreground">{t("rep.subtotal")} · {t("rep.orders_n", { n: m?.online?.completed_count ?? 0 })}</p>
          <p className="text-xs text-muted-foreground">{t("rep.fees")}: {mmk(m?.online?.delivery_fees)}</p>
        </Link>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("merchant.channels_note")} {t("rep.tz_note")}</p>
    </section>
  );
}

function Dash({ s, shops, onPick, onNew }: { s: ShopRow; shops: ShopRow[]; onPick: (id: string) => void; onNew: () => void }) {
  const { t } = useApp();
  const { tab } = Route.useSearch();
  const alerts = useUnreadCounts();
  const tiles = [
    { id: "sell" as const, label: t("pos.tab"), sub: t("pos.tile"), icon: Store, n: 0 },
    { id: "orders" as const, label: t("merchant.orders"), sub: t("merchant.tile_orders"), icon: Receipt, n: alerts.newOrders },
    { id: "chat" as const, label: t("chat.title"), sub: t("merchant.tile_chat"), icon: MessageCircle, n: alerts.shopMessages },
    { id: "products" as const, label: t("merchant.products"), sub: t("merchant.tile_products"), icon: Package, n: 0 },
    { id: "reports" as const, label: t("rep.tab"), sub: t("rep.tile"), icon: BarChart3, n: 0 },
    { id: "shop" as const, label: t("merchant.shop"), sub: t("merchant.tile_shop"), icon: Settings2, n: 0 },
  ];
  const current = tiles.find((x) => x.id === tab);
  return (
    <div className="mx-auto max-w-4xl py-6">
      {shops.length > 1 && <ShopSwitcher s={s} shops={shops} onPick={onPick} onNew={onNew} />}
      <div className="surface mb-5 flex flex-wrap items-center gap-4 p-5">
        <div className="size-14 shrink-0 overflow-hidden rounded-xl border bg-muted"><MediaImg path={s.logo_url} alt="" className="size-full" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("nav.my_shop")}</p>
          <h1 className="truncate font-display text-xl font-semibold md:text-2xl">{s.name}</h1>
          <div className="mt-1"><StatusBadge status={s.status} kind="shop" /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.status === "approved" && (
            <Button asChild variant="outline" size="sm" className="rounded-full"><Link to="/shops/$slug" params={{ slug: s.slug }}><Eye className="size-4" />{t("merchant.view_customer")}</Link></Button>
          )}
          <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/search"><ShoppingBag className="size-4" />{t("merchant.shop_market")}</Link></Button>
          {shops.length === 1 && <Button variant="ghost" size="sm" className="rounded-full" onClick={onNew}><Plus className="size-4" />{t("merchant.new_shop")}</Button>}
        </div>
      </div>
      {s.status === "pending" && <p className="mb-4 rounded-md bg-gold-soft p-3 text-sm text-gold-foreground">{t("merchant.pending_note")}</p>}
      {!current && <TodaySummary shopId={s.id} unread={alerts.shopMessages} />}
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
            <Link to="/merchant" search={{}} className="text-sm text-muted-foreground hover:text-primary">{t("nav.my_shop")}</Link>
            <ChevronRight className="size-4 text-muted-foreground" />
            <h2 className="font-semibold">{current.label}</h2>
          </div>
          {tab === "sell" && <PosSell shopId={s.id} />}
          {tab === "orders" && <MerchantOrders shopId={s.id} />}
          {tab === "chat" && <ChatInbox side="shop" shopId={s.id} />}
          {tab === "products" && <MerchantProducts shop={s} />}
          {tab === "reports" && <MerchantReports shopId={s.id} />}
          {tab === "shop" && <><ShopForm shop={s} /><ReceiptSettingsCard shopId={s.id} shop={s} /></>}
        </div>
      )}
    </div>
  );
}

function ShopForm({ shop, onCreated }: { shop?: ShopRow; onCreated?: (id: string) => void }) {
  const { t, pick, session } = useApp();
  const qc = useQueryClient();
  const cats = useQuery(categoriesQuery);
  const towns = useQuery(townshipsQuery);
  const [f, setF] = useState({
    name: shop?.name ?? "", description: shop?.description ?? "", category_id: shop?.category_id ?? "",
    township_id: shop?.township_id ?? "", address: shop?.address ?? "", phone: shop?.phone ?? "",
    opening_hours: shop?.opening_hours ?? "", offers_delivery: shop?.offers_delivery ?? true, offers_pickup: shop?.offers_pickup ?? true,
    delivery_fee: String(shop?.delivery_fee ?? 0), delivery_note: shop?.delivery_note ?? "", pickup_info: shop?.pickup_info ?? "",
    logo: shop?.logo_url ? [shop.logo_url] : [], cover: shop?.cover_url ? [shop.cover_url] : [],
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!shop && !f.township_id && towns.data) { const b = towns.data.find((x) => x.slug === "bago"); if (b) setF((o) => ({ ...o, township_id: b.id })); }
  }, [shop, towns.data, f.township_id]);
  const save = async () => {
    if (!f.name.trim()) { toast.error(`${t("merchant.shop_name")}: ${t("checkout.required")}`); return; }
    if (!f.offers_delivery && !f.offers_pickup) { toast.error(t("err.METHOD_UNAVAILABLE")); return; }
    setBusy(true);
    const payload = {
      name: f.name.trim(), description: f.description || null, category_id: f.category_id || null, township_id: f.township_id || null,
      address: f.address || null, phone: f.phone || null, opening_hours: f.opening_hours || null,
      offers_delivery: f.offers_delivery, offers_pickup: f.offers_pickup, delivery_fee: 0,
      delivery_note: f.delivery_note || null, pickup_info: f.pickup_info || null,
      is_food: top.find((c) => c.id === f.category_id)?.slug === "food",
      logo_url: f.logo[0] ?? null, cover_url: f.cover[0] ?? null,
    };
    let error;
    if (shop) {
      ({ error } = await supabase.from("shops").update(payload.name !== shop.name ? { ...payload, slug: slugify(payload.name) } : payload).eq("id", shop.id));
    } else {
      const res = await supabase.from("shops").insert({ ...payload, owner_id: session!.user.id, slug: slugify(f.name) }).select("id").single();
      error = res.error;
      if (res.data) onCreated?.(res.data.id);
    }
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
        <select className={sel} value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
          <option value="">—</option>{top.map((c) => <option key={c.id} value={c.id}>{pick(c.name_my, c.name_en)}</option>)}
        </select></div>
      <div className="space-y-1.5"><Label>{t("nav.township")}</Label>
        <select className={sel} value={f.township_id} onChange={(e) => setF({ ...f, township_id: e.target.value })}>
          <option value="">—</option>{towns.data?.map((c) => <option key={c.id} value={c.id}>{pick(c.name_my, c.name_en)}</option>)}
        </select></div>
      <div className="space-y-1.5"><Label>{t("shop.address")}</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>{t("shop.phone")}</Label><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label>{t("shop.hours")}</Label><HoursPicker value={f.opening_hours} onChange={(v) => setF({ ...f, opening_hours: v })} /></div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={f.offers_delivery} onCheckedChange={(v) => setF({ ...f, offers_delivery: v })} />{t("shop.delivery")}</label>
      <label className="flex items-center gap-2 text-sm"><Switch checked={f.offers_pickup} onCheckedChange={(v) => setF({ ...f, offers_pickup: v })} />{t("shop.pickup")}</label>
      {f.offers_pickup && <div className="space-y-1.5 sm:col-span-2"><Label>{t("merchant.pickup_info")}</Label><Input value={f.pickup_info} onChange={(e) => setF({ ...f, pickup_info: e.target.value })} /></div>}
      <ImageField label={t("merchant.logo")} value={f.logo} onChange={(v) => setF({ ...f, logo: v })} />
      <ImageField label={t("merchant.cover")} value={f.cover} onChange={(v) => setF({ ...f, cover: v })} />
      <div className="sm:col-span-2"><Button onClick={save} disabled={busy}>{busy ? t("common.loading") : shop ? t("common.save") : t("merchant.create")}</Button></div>
    </div>
  );
}

function MerchantProducts({ shop }: { shop: ShopRow }) {
  const { t, lang } = useApp();
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [mode, setMode] = useState<"csv" | "tpl" | null>(null);
  const [search, setSearch] = useState("");
  const { low: lowParam } = Route.useSearch();
  const [low, setLow] = useState(!!lowParam);
  useEffect(() => { setLow(!!lowParam); }, [lowParam]);
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
      <ImportHistory shopId={shop.id} />
      <p className="mb-2 text-sm font-semibold">{t("merchant.add_products")}</p>
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button className="h-11" onClick={() => setEditing("new")}><Plus className="size-4" />{t("merchant.add_one")}</Button>
        <Button className="h-11" variant="outline" onClick={() => setMode("tpl")}>{t("merchant.from_catalog")}</Button>
        <Button className="h-11" variant="outline" onClick={() => setMode("csv")}>{t("merchant.import_csv")}</Button>
      </div>
      <Input className="mb-3 h-11" placeholder={t("merchant.search_products")} value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="mb-3 flex flex-wrap gap-2">
        {([false, true] as const).map((v) => (
          <button key={String(v)} type="button" aria-pressed={low === v} onClick={() => setLow(v)}
            className={`min-h-9 rounded-full border px-3 text-sm ${low === v ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card"}`}>
            {v ? `${t("merchant.low_filter")} (${t("merchant.low_stock_hint")})` : t("merchant.all")}
          </button>
        ))}
      </div>
      {(q.data ?? []).length === 0 ? <EmptyState text={t("product.empty")} /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {(low ? lowStockList(q.data!) : q.data!).filter((p) => { const n = search.trim().toLowerCase(); return !n || p.name.toLowerCase().includes(n) || (p.sku ?? "").toLowerCase().includes(n) || (p.barcode ?? "") === search.trim() || (p.barcode ?? "").includes(n); }).map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <MediaImg path={p.images[0]} alt={p.name} className="size-14 shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{formatMMK(p.sale_price ?? p.price, lang)} · {t("merchant.stock")}: {p.stock} · {p.is_active ? t("common.active") : t("merchant.hidden")}{p.sku ? ` · ${p.sku}` : ""}</p>
                {p.is_active && p.price <= 0 && <p className="text-xs text-destructive">{t("merchant.zero_notice")}</p>}
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
      <Dialog open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{mode === "csv" ? t("imp.title") : t("tpl.title")}</DialogTitle></DialogHeader>
          {mode === "csv" && <CsvImport shopId={shop.id} onDone={() => setMode(null)} />}
          {mode === "tpl" && <TemplatePicker shopId={shop.id} onDone={() => setMode(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductForm({ shopId, product, onDone }: { shopId: string; product?: ProductRow | undefined; onDone: () => void }) {
  const { t, pick, lang } = useApp();
  const [draftLang, setDraftLang] = useState<DraftLang>(lang);
  const qc = useQueryClient();
  const cats = useQuery(categoriesQuery);
  const [f, setF] = useState({
    name: product?.name ?? "", description: product?.description ?? "", category_id: product?.category_id ?? "",
    price: String(product?.price ?? ""), sale_price: product?.sale_price != null ? String(product.sale_price) : "",
    shop_category_id: product?.shop_category_id ?? "",
    stock: String(product?.stock ?? 0), is_active: product?.is_active ?? true, images: product?.images ?? [],
    sku: product?.sku ?? "", barcode: product?.barcode ?? "",
  });
  const [details, setDetails] = useState<DescDetails>({});
  const [showDesc, setShowDesc] = useState(false);
  const errs = validateProduct(f);
  const [busy, setBusy] = useState(false);
  const all = cats.data ?? [];
  const own = useQuery(shopCategoriesQuery(shopId));
  const save = async () => {
    if (errs.length) { toast.error(t(`pe.${errs[0]}` as TKey)); return; }
    setBusy(true);
    const payload = {
      name: f.name.trim(), description: f.description || null, category_id: f.category_id || null,
      shop_category_id: f.shop_category_id || null,
      price: Number(f.price), sale_price: f.sale_price ? Number(f.sale_price) : null, stock: Number(f.stock) || 0,
      is_active: f.is_active, images: f.images, sku: f.sku.trim() || null, barcode: f.barcode.trim() || null,
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert({ ...payload, shop_id: shopId });
    setBusy(false);
    if (error) {
      const m = error.message ?? "";
      toast.error(error.code === "23505" ? t("pe.code_taken") : m.includes("INVALID_SALE_PRICE") ? t("pe.sale_invalid") : m.includes("ZERO_PRICE_ACTIVE") ? t("pe.zero_price_visible") : t("err.generic"));
      return;
    }
    qc.invalidateQueries();
    onDone();
  };
  const num = (k: "price" | "sale_price" | "stock") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value.replace(/\D/g, "") });
  return (
    <div className="space-y-3">
      <div className="space-y-1.5"><Label>{t("merchant.product_name")}</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>{t("merchant.description")}</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <button type="button" onClick={() => setShowDesc(!showDesc)} className="text-sm font-medium text-primary">{t("desc.title")}</button>
        {showDesc && <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs text-muted-foreground">{t("desc.hint")}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["brand", "model", "size", "color", "material", "condition"] as const).map((k) => (
              <Input key={k} placeholder={t(`desc.${k}` as TKey)} value={details[k] ?? ""} onChange={(e) => setDetails({ ...details, [k]: e.target.value })} className="h-10" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { const d = draftDescription(details, draftLang, f.name); if (d) setF({ ...f, description: applyDraft(f.description, d) }); }}>{t("desc.make")}</Button>
            <div className="inline-flex overflow-hidden rounded-md border text-xs font-semibold" role="group" aria-label={t("account.language")}>
              {(["my", "en"] as const).map((l) => <button key={l} type="button" aria-pressed={draftLang === l} onClick={() => setDraftLang(l)}
                className={`px-2.5 py-1.5 ${draftLang === l ? "bg-primary text-primary-foreground" : "bg-card"}`}>{l === "my" ? "MY" : "EN"}</button>)}
            </div>
          </div>
        </div>}
      </div>
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
      {errs.filter((e) => e !== "name_required" && e !== "price_required").map((e) => <p key={e} className="text-sm text-destructive">{t(`pe.${e}` as TKey)}</p>)}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5"><Label className="text-xs">{t("merchant.sku")}</Label><Input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">{t("merchant.barcode")}</Label><Input inputMode="numeric" value={f.barcode} onChange={(e) => setF({ ...f, barcode: e.target.value })} /></div>
      </div>
      <ImageField multiple label={t("merchant.images")} value={f.images} onChange={(v) => setF({ ...f, images: v })} />
      <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />{f.is_active ? t("common.active") : t("merchant.hidden")}</label>
      {product && <StockHistory productId={product.id} />}
      <Button onClick={save} disabled={busy} className="w-full">{t("common.save")}</Button>
    </div>
  );
}

function MerchantOrders({ shopId }: { shopId: string }) {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter | "all" | null>(null);
  const pendingN = useQuery({
    queryKey: ["shop-orders", shopId, "pending-count"],
    queryFn: async () => (await supabase.from("orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "pending")).count ?? 0,
  });
  const f: OrderFilter | "all" = filter ?? ((pendingN.data ?? 0) > 0 ? "pending" : "all");
  const q = useQuery({
    queryKey: ["shop-orders", shopId, f],
    enabled: filter !== null || pendingN.isFetched,
    queryFn: async () => {
      let qb = supabase.from("orders").select("id, order_no, status, total, delivery_method, recipient_name, created_at").eq("shop_id", shopId);
      if (f !== "all") qb = qb.in("status", [...ORDER_FILTERS[f]]);
      const { data, error } = await qb.order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  // Live sockets to the backend are blocked on many Myanmar networks; poll instead.
  useEffect(() => {
    const id = setInterval(() => qc.invalidateQueries({ queryKey: ["shop-orders", shopId] }), 10000);
    return () => clearInterval(id);
  }, [shopId, qc]);
  const chips: (OrderFilter | "all")[] = ["all", ...(Object.keys(ORDER_FILTERS) as OrderFilter[])];
  return (
    <>
      <div className="mb-3 flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
        {chips.map((c) => (
          <button key={c} type="button" aria-pressed={f === c} onClick={() => setFilter(c)}
            className={`min-h-9 shrink-0 rounded-full border px-3 text-sm ${f === c ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card"}`}>
            {c === "all" ? t("merchant.all") : t(`of.${c}` as TKey)}{c === "pending" && (pendingN.data ?? 0) > 0 ? ` (${pendingN.data})` : ""}
          </button>
        ))}
      </div>
      {(q.data ?? []).length === 0 ? <EmptyState text={t("merchant.no_orders")} /> : <ul className="divide-y rounded-lg border bg-card">
        {q.data!.map((o) => (
          <li key={o.id}>
            <button onClick={() => setOpen(o.id)} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-muted/50">
              <div><p className="font-medium">{t("orders.number", { n: o.order_no })} · {o.recipient_name}</p>
                <p className="text-xs text-muted-foreground">{t(o.delivery_method === "delivery" ? "checkout.delivery" : "checkout.pickup")} · {new Date(o.created_at).toLocaleString()}</p></div>
              <div className="flex items-center gap-3"><span className="text-sm font-medium">{formatMMK(o.total, lang)}</span><StatusBadge status={o.status} /></div>
            </button>
          </li>
        ))}
      </ul>}
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

const HOUR_OPTS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const ALL_DAY = "24/7";
/** Opening hours as two time pickers + quick presets; stored as "08:00 – 20:00" (or "24/7"). */
function HoursPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useApp();
  const m = value.match(/(\d{1,2}):(\d{2}).*?(\d{1,2}):(\d{2})/);
  const norm = (h: string, mm: string) => `${h.padStart(2, "0")}:${mm}`;
  const open = m ? norm(m[1]!, m[2]!) : "08:00";
  const close = m ? norm(m[3]!, m[4]!) : "20:00";
  const allDay = value.trim() === ALL_DAY;
  const set = (o: string, c: string) => onChange(`${o} – ${c}`);
  const sel = "h-10 rounded-md border bg-card px-2 text-sm tabular-nums disabled:opacity-50";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label={t("hours.open")} className={sel} disabled={allDay} value={open} onChange={(e) => set(e.target.value, close)}>{HOUR_OPTS.map((h) => <option key={h}>{h}</option>)}</select>
        <span className="text-sm text-muted-foreground">–</span>
        <select aria-label={t("hours.close")} className={sel} disabled={allDay} value={close} onChange={(e) => set(open, e.target.value)}>{HOUR_OPTS.map((h) => <option key={h}>{h}</option>)}</select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[["08:00", "20:00"], ["09:00", "21:00"], ["06:00", "18:00"]].map(([o, c]) => (
          <button key={o} type="button" onClick={() => set(o!, c!)} className={`rounded-full border px-3 py-1 text-xs tabular-nums ${!allDay && open === o && close === c && m ? "border-primary bg-primary-soft text-primary" : "bg-card"}`}>{o} – {c}</button>
        ))}
        <button type="button" onClick={() => onChange(allDay ? "08:00 – 20:00" : ALL_DAY)} className={`rounded-full border px-3 py-1 text-xs ${allDay ? "border-primary bg-primary-soft text-primary" : "bg-card"}`}>{t("hours.all_day")}</button>
        {value && <button type="button" onClick={() => onChange("")} className="rounded-full px-3 py-1 text-xs text-muted-foreground underline">{t("hours.clear")}</button>}
      </div>
    </div>
  );
}
