import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { formatMMK } from "@/lib/domain/rules";
import { MediaImg, StatusBadge, EmptyState } from "@/components/site/bits";
import { RequireAuth } from "@/components/site/shell";
import { ImageField } from "@/components/site/upload";
import { OrderDetail } from "@/components/site/order-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type Cat = Database["public"]["Tables"]["categories"]["Row"];
type Promo = Database["public"]["Tables"]["promotions"]["Row"];

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Bago Market" },
      { name: "description", content: "Bago Market administration." },
      { property: "og:title", content: "Admin · Bago Market" },
      { property: "og:description", content: "Platform administration." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <RequireAuth role="admin"><Admin /></RequireAuth>,
});

function Admin() {
  const { t } = useApp();
  return (
    <div className="py-6">
      <h1 className="mb-4 text-xl font-bold">{t("admin.title")}</h1>
      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">{t("admin.overview")}</TabsTrigger>
          <TabsTrigger value="shops">{t("admin.shops")}</TabsTrigger>
          <TabsTrigger value="products">{t("admin.products")}</TabsTrigger>
          <TabsTrigger value="orders">{t("admin.orders")}</TabsTrigger>
          <TabsTrigger value="categories">{t("admin.categories")}</TabsTrigger>
          <TabsTrigger value="promotions">{t("admin.promotions")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4"><Overview /></TabsContent>
        <TabsContent value="shops" className="pt-4"><Shops /></TabsContent>
        <TabsContent value="products" className="pt-4"><Products /></TabsContent>
        <TabsContent value="orders" className="pt-4"><Orders /></TabsContent>
        <TabsContent value="categories" className="pt-4"><Categories /></TabsContent>
        <TabsContent value="promotions" className="pt-4"><Promotions /></TabsContent>
      </Tabs>
    </div>
  );
}

function Overview() {
  const { t } = useApp();
  const q = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const c = async (table: "shops" | "products" | "orders", f?: (b: any) => any) => {
        let b: any = supabase.from(table).select("id", { count: "exact", head: true });
        if (f) b = f(b);
        return (await b).count ?? 0;
      };
      return {
        pending: await c("shops", (b) => b.eq("status", "pending")),
        shops: await c("shops", (b) => b.eq("status", "approved")),
        products: await c("products"),
        orders: await c("orders"),
      };
    },
  });
  const items = [
    [t("shopstatus.pending"), q.data?.pending], [t("admin.shops"), q.data?.shops],
    [t("admin.products"), q.data?.products], [t("admin.orders"), q.data?.orders],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(([l, v]) => <div key={l} className="surface p-4"><p className="text-[13px] text-muted-foreground">{l}</p><p className="text-2xl font-bold">{v ?? "–"}</p></div>)}
    </div>
  );
}

function Shops() {
  const { t } = useApp();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");
  const q = useQuery({
    queryKey: ["admin-shops", filter],
    queryFn: async () => {
      let b = supabase.from("shops").select("*").order("created_at", { ascending: false }).limit(100);
      if (filter) b = b.eq("status", filter as "pending");
      const { data, error } = await b;
      if (error) throw error;
      return data;
    },
  });
  const upd = async (id: string, patch: Partial<Database["public"]["Tables"]["shops"]["Update"]>) => {
    const { error } = await supabase.from("shops").update(patch).eq("id", id);
    if (error) { toast.error(t("err.generic")); return; }
    qc.invalidateQueries();
  };
  return (
    <div>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-3 h-9 rounded-md border bg-card px-2 text-sm">
        <option value="">{t("filter.all")}</option>
        {(["pending", "approved", "rejected", "suspended"] as const).map((s) => <option key={s} value={s}>{t(`shopstatus.${s}`)}</option>)}
      </select>
      {(q.data ?? []).length === 0 ? <EmptyState text={t("common.none_yet")} /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {q.data!.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
              <MediaImg path={s.logo_url} alt="" className="size-12 rounded" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name} {s.is_featured && <span className="text-[13px] text-gold-foreground">★</span>}</p>
                <p className="line-clamp-1 text-[13px] text-muted-foreground">{s.phone} · {s.address}</p>
              </div>
              <StatusBadge status={s.status} kind="shop" />
              <div className="flex flex-wrap gap-1.5">
                {s.status !== "approved" && <Button size="sm" onClick={() => upd(s.id, { status: "approved", is_active: true })}>{s.status === "suspended" ? t("admin.reactivate") : t("admin.approve")}</Button>}
                {s.status === "pending" && <Button size="sm" variant="outline" onClick={() => upd(s.id, { status: "rejected" })}>{t("admin.reject")}</Button>}
                {s.status === "approved" && <Button size="sm" variant="outline" onClick={() => upd(s.id, { status: "suspended" })}>{t("admin.suspend")}</Button>}
                {s.status === "approved" && <Button size="sm" variant="ghost" onClick={() => upd(s.id, { is_featured: !s.is_featured })}>{s.is_featured ? t("admin.unfeature") : t("admin.feature")}</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Products() {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, price, stock, is_active, images, shops(name)").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  return (q.data ?? []).length === 0 ? <EmptyState text={t("product.empty")} /> : (
    <ul className="divide-y rounded-lg border bg-card">
      {q.data!.map((p) => (
        <li key={p.id} className="flex items-center gap-3 p-3">
          <MediaImg path={p.images[0]} alt="" className="size-12 rounded" />
          <div className="min-w-0 flex-1"><p className="line-clamp-1 font-medium">{p.name}</p><p className="text-[13px] text-muted-foreground">{p.shops?.name} · {formatMMK(p.price, lang)} · {p.stock}</p></div>
          <Switch checked={p.is_active} onCheckedChange={async (v) => { await supabase.from("products").update({ is_active: v }).eq("id", p.id); qc.invalidateQueries({ queryKey: ["admin-products"] }); }} />
        </li>
      ))}
    </ul>
  );
}

function Orders() {
  const { t, lang } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, order_no, status, total, created_at, shops(name)").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  return (
    <>
      {(q.data ?? []).length === 0 ? <EmptyState text={t("orders.empty")} /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {q.data!.map((o) => (
            <li key={o.id}><button onClick={() => setOpen(o.id)} className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-muted/50">
              <span><span className="font-medium">#{o.order_no}</span> <span className="text-sm text-muted-foreground">{o.shops?.name}</span></span>
              <span className="flex items-center gap-3 text-sm">{formatMMK(o.total, lang)}<StatusBadge status={o.status} /></span>
            </button></li>
          ))}
        </ul>
      )}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle className="sr-only">Order</DialogTitle></DialogHeader>
          {open && <OrderDetail id={open} as="merchant" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Categories() {
  const { t, pick } = useApp();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Cat> | null>(null);
  const q = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort");
      if (error) throw error;
      return data;
    },
  });
  const all = q.data ?? [];
  const save = async () => {
    if (!edit?.name_my || !edit.name_en) { toast.error(t("checkout.required")); return; }
    const payload = {
      name_my: edit.name_my, name_en: edit.name_en, parent_id: edit.parent_id || null, sort: Number(edit.sort) || 0,
      is_active: edit.is_active ?? true, icon: edit.icon || null,
      slug: edit.slug || edit.name_en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 5),
    };
    const { error } = edit.id ? await supabase.from("categories").update(payload).eq("id", edit.id) : await supabase.from("categories").insert(payload);
    if (error) { toast.error(t("err.generic")); return; }
    setEdit(null);
    qc.invalidateQueries();
  };
  const row = (c: Cat, depth = 0) => (
    <li key={c.id} className="flex items-center gap-3 p-3" style={{ paddingLeft: 12 + depth * 24 }}>
      <span className="w-8 text-[13px] text-muted-foreground">{c.sort}</span>
      <span className="flex-1 text-sm">{pick(c.name_my, c.name_en)} <span className="text-[13px] text-muted-foreground">/ {c.name_en}</span></span>
      {!c.is_active && <span className="text-[13px] text-muted-foreground">{t("common.inactive")}</span>}
      <Button size="sm" variant="outline" onClick={() => setEdit(c)}>{t("common.edit")}</Button>
    </li>
  );
  return (
    <div>
      <Button className="mb-3" onClick={() => setEdit({ is_active: true, sort: 0 })}>+ {t("common.add")}</Button>
      <ul className="divide-y rounded-lg border bg-card">
        {all.filter((c) => !c.parent_id).flatMap((c) => [row(c), ...all.filter((s) => s.parent_id === c.id).map((s) => row(s, 1))])}
      </ul>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("admin.categories")}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>{t("admin.name_my")}</Label><Input value={edit.name_my ?? ""} onChange={(e) => setEdit({ ...edit, name_my: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("admin.name_en")}</Label><Input value={edit.name_en ?? ""} onChange={(e) => setEdit({ ...edit, name_en: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("admin.parent")}</Label>
                <select className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={edit.parent_id ?? ""} onChange={(e) => setEdit({ ...edit, parent_id: e.target.value || null })}>
                  <option value="">—</option>{all.filter((c) => !c.parent_id && c.id !== edit.id).map((c) => <option key={c.id} value={c.id}>{pick(c.name_my, c.name_en)}</option>)}
                </select></div>
              <div className="space-y-1.5"><Label>{t("admin.sort")}</Label><Input inputMode="numeric" value={String(edit.sort ?? 0)} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value.replace(/\D/g, "")) })} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={edit.is_active ?? true} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} />{t("common.active")}</label>
              <Button onClick={save} className="w-full">{t("common.save")}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Promotions() {
  const { t, pick } = useApp();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Promo> | null>(null);
  const q = useQuery({
    queryKey: ["admin-promos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select("*").order("sort");
      if (error) throw error;
      return data;
    },
  });
  const save = async () => {
    if (!edit?.title_my || !edit.title_en) { toast.error(t("checkout.required")); return; }
    const payload = {
      title_my: edit.title_my, title_en: edit.title_en, subtitle_my: edit.subtitle_my || null, subtitle_en: edit.subtitle_en || null,
      link: edit.link || null, image_url: edit.image_url || null, is_active: edit.is_active ?? true, sort: Number(edit.sort) || 0,
      starts_at: edit.starts_at || new Date().toISOString(), ends_at: edit.ends_at || null,
    };
    const { error } = edit.id ? await supabase.from("promotions").update(payload).eq("id", edit.id) : await supabase.from("promotions").insert(payload);
    if (error) { toast.error(t("err.generic")); return; }
    setEdit(null);
    qc.invalidateQueries();
  };
  const del = async (id: string) => { await supabase.from("promotions").delete().eq("id", id); qc.invalidateQueries(); };
  const d = (v?: string | null) => (v ? v.slice(0, 10) : "");
  return (
    <div>
      <Button className="mb-3" onClick={() => setEdit({ is_active: true })}>+ {t("common.add")}</Button>
      {(q.data ?? []).length === 0 ? <EmptyState text={t("common.none_yet")} /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {q.data!.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <MediaImg path={p.image_url} alt="" className="h-12 w-24 rounded" />
              <div className="flex-1 text-sm"><p className="font-medium">{pick(p.title_my, p.title_en)}</p><p className="text-[13px] text-muted-foreground">{d(p.starts_at)} → {d(p.ends_at) || "∞"} · {p.is_active ? t("common.active") : t("common.inactive")}</p></div>
              <Button size="sm" variant="outline" onClick={() => setEdit(p)}>{t("common.edit")}</Button>
              <Button size="sm" variant="ghost" onClick={() => del(p.id)}>{t("common.delete")}</Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.promotions")}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <ImageField label="Image" value={edit.image_url ? [edit.image_url] : []} onChange={(v) => setEdit({ ...edit, image_url: v[0] ?? null })} />
              <div className="space-y-1.5"><Label>{t("admin.title_my")}</Label><Input value={edit.title_my ?? ""} onChange={(e) => setEdit({ ...edit, title_my: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("admin.title_en")}</Label><Input value={edit.title_en ?? ""} onChange={(e) => setEdit({ ...edit, title_en: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Subtitle (MY)" value={edit.subtitle_my ?? ""} onChange={(e) => setEdit({ ...edit, subtitle_my: e.target.value })} />
                <Input placeholder="Subtitle (EN)" value={edit.subtitle_en ?? ""} onChange={(e) => setEdit({ ...edit, subtitle_en: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>{t("admin.link")}</Label><Input placeholder="/c/food" value={edit.link ?? ""} onChange={(e) => setEdit({ ...edit, link: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label>{t("admin.starts")}</Label><Input type="date" value={d(edit.starts_at)} onChange={(e) => setEdit({ ...edit, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null as unknown as string })} /></div>
                <div className="space-y-1.5"><Label>{t("admin.ends")}</Label><Input type="date" value={d(edit.ends_at)} onChange={(e) => setEdit({ ...edit, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={edit.is_active ?? true} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} />{t("common.active")}</label>
              <Button onClick={save} className="w-full">{t("common.save")}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <p className="mt-3 text-[13px] text-muted-foreground"><Link to="/" className="underline">→ Home</Link></p>
    </div>
  );
}
