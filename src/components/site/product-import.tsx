import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { shopCategoriesQuery } from "@/lib/queries";
import {
  CSV_EXAMPLE, CSV_FIELDS, CSV_MAX_ROWS, analyzeRows, autoMap, parseCsv, rowValues, validateProduct,
  type CsvField, type ExistingProduct, type RowValues, type RowErr,
} from "@/lib/domain/products";
import type { TKey } from "@/lib/i18n/dict";

const errKey = (e: RowErr) => `pe.${e}` as TKey;

function useExisting(shopId: string) {
  return useQuery({
    queryKey: ["my-products-codes", shopId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,price,sale_price,stock,sku,barcode,description").eq("shop_id", shopId);
      if (error) throw error;
      return data as ExistingProduct[];
    },
  });
}

async function ensureCategories(shopId: string, names: string[], existing: { id: string; name: string }[]) {
  const map = new Map(existing.map((c) => [c.name.trim().toLowerCase(), c.id]));
  for (const n of [...new Set(names.map((x) => x.trim()).filter(Boolean))]) {
    if (map.has(n.toLowerCase())) continue;
    const { data } = await supabase.from("shop_categories").insert({ shop_id: shopId, name: n.slice(0, 60), sort: map.size }).select("id").single();
    if (data) map.set(n.toLowerCase(), data.id);
  }
  return map;
}

export function CsvImport({ shopId, onDone }: { shopId: string; onDone: () => void }) {
  const { t } = useApp();
  const qc = useQueryClient();
  const existing = useExisting(shopId);
  const cats = useQuery(shopCategoriesQuery(shopId));
  const [file, setFile] = useState<string>("");
  const [cells, setCells] = useState<{ headers: string[]; body: string[][] } | null>(null);
  const [map, setMap] = useState<Partial<Record<CsvField, number>>>({});
  const [rows, setRows] = useState<RowValues[] | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [dupOk, setDupOk] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);

  const analyzed = useMemo(() => (rows ? analyzeRows(rows, existing.data ?? []) : []), [rows, existing.data]);

  const download = () => {
    const url = URL.createObjectURL(new Blob(["\uFEFF" + CSV_EXAMPLE], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "bago-market-products-example.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const all = parseCsv(await f.text());
    if (all.length < 2) { toast.error(t("imp.empty")); return; }
    if (all.length - 1 > CSV_MAX_ROWS) { toast.error(t("imp.too_many", { n: CSV_MAX_ROWS })); return; }
    setFile(f.name); setCells({ headers: all[0]!, body: all.slice(1) }); setMap(autoMap(all[0]!)); setRows(null);
  };
  const edit = (i: number, k: keyof RowValues, v: string) => setRows((r) => r!.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const save = async () => {
    if (!rows) return;
    setBusy(true);
    try {
      const fresh = analyzed.filter((r) => !r.errors.length && !r.matchId && (!r.possibleDuplicate || dupOk[r.line]));
      const catMap = await ensureCategories(shopId, fresh.map((r) => r.values.category), cats.data ?? []);
      let added = 0, updated = 0, failed = 0;
      if (fresh.length) {
        const payload = fresh.map(({ values: v }) => ({
          shop_id: shopId, name: v.name.slice(0, 200), price: Number(v.price), sale_price: v.sale_price ? Number(v.sale_price) : null,
          stock: v.stock ? Number(v.stock) : 0, sku: v.sku || null, barcode: v.barcode || null, description: v.description || null,
          shop_category_id: v.category ? catMap.get(v.category.trim().toLowerCase()) ?? null : null, is_active: false,
        }));
        for (let i = 0; i < payload.length; i += 100) {
          const chunk = payload.slice(i, i + 100);
          const { error } = await supabase.from("products").insert(chunk);
          if (error) failed += chunk.length; else added += chunk.length;
        }
      }
      for (const r of analyzed) {
        if (!r.matchId || r.errors.length) continue;
        const ch = r.changes.filter((c) => ticked[`${r.line}:${c.field}`]);
        if (!ch.length) continue;
        const cur = existing.data!.find((p) => p.id === r.matchId)!;
        const upd: { name?: string; price?: number; sale_price?: number | null; stock?: number; description?: string } = {};
        for (const c of ch) { if (c.field === "price" || c.field === "stock") upd[c.field] = Number(c.to); else if (c.field === "sale_price") upd.sale_price = c.to ? Number(c.to) : null; else upd[c.field] = c.to; }
        const price = upd.price ?? cur.price; const sale = "sale_price" in upd ? upd.sale_price : cur.sale_price;
        if (sale != null && Number(sale) >= price) { failed++; continue; }
        const { error } = await supabase.from("products").update(upd).eq("id", r.matchId);
        if (error) failed++; else updated++;
      }
      await supabase.from("product_imports").insert({ shop_id: shopId, file_name: file.slice(0, 200), added, updated });
      qc.invalidateQueries();
      toast.success(t("imp.done", { a: added, u: updated }));
      if (failed) toast.error(t("err.generic"));
      onDone();
    } finally { setBusy(false); }
  };

  const nNew = analyzed.filter((r) => !r.errors.length && !r.matchId).length;
  const nUpd = analyzed.filter((r) => r.changes.length).length;
  const nErr = analyzed.filter((r) => r.errors.length).length;

  return (
    <div className="space-y-4">
      <p className="rounded-md bg-gold-soft p-3 text-sm text-gold-foreground">{t("imp.notice")}</p>
      {!cells && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={download}><Download className="size-4" />{t("imp.example")}</Button>
          <Button asChild><label className="cursor-pointer"><Upload className="size-4" />{t("imp.choose")}
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} /></label></Button>
        </div>
      )}
      {cells && !rows && (
        <div className="space-y-3">
          <p className="font-semibold">{t("imp.map")} · {file}</p>
          {CSV_FIELDS.map((f) => (
            <div key={f} className="grid grid-cols-2 items-center gap-2">
              <Label>{f}{(f === "name" || f === "price") && " *"}</Label>
              <select className="h-10 rounded-md border bg-card px-2 text-sm" value={map[f] ?? ""} onChange={(e) => setMap({ ...map, [f]: e.target.value === "" ? undefined : Number(e.target.value) })}>
                <option value="">{t("imp.unmapped")}</option>
                {cells.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setCells(null)}>{t("imp.back")}</Button>
            <Button disabled={map.name === undefined || map.price === undefined} onClick={() => setRows(cells.body.map((c) => rowValues(c, map)))}>{t("imp.preview")}</Button>
          </div>
        </div>
      )}
      {rows && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{t("imp.summary", { a: nNew, u: nUpd, e: nErr })}</p>
          <p className="text-xs text-muted-foreground">{t("imp.hidden_note")}</p>
          <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border bg-card">
            {analyzed.map((r, i) => (
              <li key={r.line} className="space-y-2 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{t("imp.row", { n: r.line })} · {r.values.name || "—"}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${r.errors.length ? "bg-destructive/10 text-destructive" : r.matchId ? "bg-gold-soft text-gold-foreground" : "bg-primary/10 text-primary"}`}>
                    {r.errors.length ? t("imp.error") : r.matchId ? (r.changes.length ? t("imp.update") : t("imp.nochange")) : t("imp.new")}
                  </span>
                </div>
                {r.errors.map((e) => <p key={e} className="flex items-center gap-1 text-destructive"><AlertTriangle className="size-3.5" />{t(errKey(e))}</p>)}
                {r.errors.some((e) => e !== "dup_in_file" && e !== "code_conflict") && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(["name", "price", "sale_price", "stock"] as const).map((k) => (
                      <Input key={k} aria-label={k} placeholder={k} value={r.values[k]} onChange={(e) => edit(i, k, e.target.value)} className="h-9" />
                    ))}
                  </div>
                )}
                {(r.errors.includes("dup_in_file") || r.errors.includes("code_conflict")) && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input aria-label="sku" placeholder="SKU" value={r.values.sku} onChange={(e) => edit(i, "sku", e.target.value)} className="h-9" />
                    <Input aria-label="barcode" placeholder="Barcode" value={r.values.barcode} onChange={(e) => edit(i, "barcode", e.target.value)} className="h-9" />
                  </div>
                )}
                {!r.errors.length && !r.matchId && r.values.price === "0" && <p className="text-xs text-muted-foreground">{t("imp.zero_warn")}</p>}
                {!r.errors.length && r.possibleDuplicate && (
                  <label className="flex items-center gap-2 text-xs"><Checkbox checked={!!dupOk[r.line]} onCheckedChange={(v) => setDupOk({ ...dupOk, [r.line]: !!v })} />{t("imp.possible_dup")}</label>
                )}
                {r.changes.map((c) => (
                  <label key={c.field} className="flex items-center gap-2 text-xs">
                    <Checkbox checked={!!ticked[`${r.line}:${c.field}`]} onCheckedChange={(v) => setTicked({ ...ticked, [`${r.line}:${c.field}`]: !!v })} />
                    <span><b>{c.field}</b>: {c.from || "—"} → {c.to}</span>
                  </label>
                ))}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setRows(null)}>{t("imp.back")}</Button>
            <Button onClick={save} disabled={busy}>{busy ? t("common.loading") : t("imp.save")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ImportHistory({ shopId }: { shopId: string }) {
  const { t } = useApp();
  const q = useQuery({
    queryKey: ["product-imports", shopId],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_imports").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });
  if (!(q.data ?? []).length) return null;
  return (
    <details className="surface mb-5 p-4 text-sm">
      <summary className="cursor-pointer font-semibold">{t("imp.history")}</summary>
      <ul className="mt-2 space-y-1 text-muted-foreground">
        {q.data!.map((r) => <li key={r.id}>{new Date(r.created_at).toLocaleString()} · {r.file_name} · {t("imp.done", { a: r.added, u: r.updated })}</li>)}
      </ul>
    </details>
  );
}

export function TemplatePicker({ shopId, onDone }: { shopId: string; onDone: () => void }) {
  const { t, pick } = useApp();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["product-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_templates").select("*").eq("is_active", true).order("sort");
      if (error) throw error;
      return data;
    },
  });
  const [search, setSearch] = useState("");
  const [vals, setVals] = useState<Record<string, { price: string; stock: string }>>({});
  const [busy, setBusy] = useState(false);
  const list = (q.data ?? []).filter((x) => !search || `${x.name_my} ${x.name_en} ${x.group_my} ${x.group_en}`.toLowerCase().includes(search.toLowerCase()));
  if (!q.isLoading && !(q.data ?? []).length) return <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">{t("tpl.empty")}</p>;
  const ready = list.filter((x) => { const v = vals[x.id]; return v && v.price && v.stock !== "" && !validateProduct({ name: "x", price: v.price, sale_price: "", stock: v.stock, is_active: true }).length; });
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("products").insert(ready.map((x) => ({ shop_id: shopId, name: pick(x.name_my, x.name_en), price: Number(vals[x.id]!.price), stock: Number(vals[x.id]!.stock), is_active: false })));
    setBusy(false);
    if (error) { toast.error(t("err.generic")); return; }
    qc.invalidateQueries(); toast.success(t("imp.done", { a: ready.length, u: 0 })); onDone();
  };
  return (
    <div className="space-y-3">
      <Input placeholder={t("nav.search_placeholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
      <p className="text-xs text-muted-foreground">{t("tpl.fill")} · {t("imp.hidden_note")}</p>
      <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border bg-card">
        {list.map((x) => (
          <li key={x.id} className="grid grid-cols-[1fr_6rem_5rem] items-center gap-2 p-2 text-sm">
            <span><span className="block">{pick(x.name_my, x.name_en)}</span><span className="text-xs text-muted-foreground">{pick(x.group_my, x.group_en)}</span></span>
            <Input inputMode="numeric" placeholder={t("merchant.price")} value={vals[x.id]?.price ?? ""} onChange={(e) => setVals({ ...vals, [x.id]: { price: e.target.value.replace(/\D/g, ""), stock: vals[x.id]?.stock ?? "" } })} className="h-9" />
            <Input inputMode="numeric" placeholder={t("merchant.stock")} value={vals[x.id]?.stock ?? ""} onChange={(e) => setVals({ ...vals, [x.id]: { price: vals[x.id]?.price ?? "", stock: e.target.value.replace(/\D/g, "") } })} className="h-9" />
          </li>
        ))}
      </ul>
      <Button onClick={save} disabled={busy || !ready.length} className="w-full">{t("imp.save")} ({ready.length})</Button>
    </div>
  );
}
