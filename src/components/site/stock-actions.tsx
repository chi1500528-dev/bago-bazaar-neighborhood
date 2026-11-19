import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackagePlus, ClipboardCheck } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { formatMMK } from "@/lib/domain/rules";
import { ADJUST_REASONS, validateAdjust, validateReceive, parseUnitCost, type AdjustReason } from "@/lib/domain/stock";
import { stock, newStockKey } from "@/lib/stock";
import type { TKey } from "@/lib/i18n/dict";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type P = { id: string; name: string; stock: number };
const digits = (s: string) => s.replace(/\D/g, "");
function errText(t: (k: TKey) => string, m: string) {
  const code = ["FORBIDDEN", "INVALID_QUANTITY", "INVALID_COST", "REASON_REQUIRED", "NOTE_REQUIRED", "NO_CHANGE"].find((c) => m.includes(c));
  return code ? t(`stk.e.${code}` as TKey) : t("err.generic");
}

/** Current stock (read-only), current cost, and the only two ways to change stock. */
export function StockActions({ product, onChanged }: { product: P; onChanged?: () => void }) {
  const { t, lang } = useApp();
  const [mode, setMode] = useState<"receive" | "adjust" | null>(null);
  const cost = useQuery({ queryKey: ["product-cost", product.id], queryFn: () => stock.cost(product.id) });
  const c = cost.data?.data;
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm">{t("merchant.stock")}: <b className="tabular-nums">{product.stock}</b></p>
        <p className="text-xs text-muted-foreground">{t("stk.cost_now")}: {c == null ? t("stk.cost_unknown") : formatMMK(c, lang)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={() => setMode("receive")}><PackagePlus className="size-4" />{t("stk.receive")}</Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => setMode("adjust")}><ClipboardCheck className="size-4" />{t("stk.adjust")}</Button>
      </div>
      <CostEdit productId={product.id} current={c ?? null} />
      <Dialog open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>{mode === "receive" ? t("stk.receive") : t("stk.adjust")} · {product.name}</DialogTitle></DialogHeader>
          {mode === "receive" && <ReceiveForm product={product} onDone={() => { setMode(null); onChanged?.(); }} />}
          {mode === "adjust" && <AdjustForm product={product} onDone={() => { setMode(null); onChanged?.(); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function useDone() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

function ReceiveForm({ product, onDone }: { product: P; onDone: () => void }) {
  const { t } = useApp();
  const done = useDone();
  const [f, setF] = useState({ qty: "", unitCost: "", supplier: "", reference: "" });
  const key = useRef(newStockKey());
  useEffect(() => { key.current = newStockKey(); }, [f.qty, f.unitCost]);
  const errs = validateReceive(f);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (errs.length) { toast.error(t(`stk.v.${errs[0]}` as TKey)); return; }
    setBusy(true);
    const { error } = await stock.receive(product.id, Number(f.qty), parseUnitCost(f.unitCost), f.supplier.trim(), f.reference.trim(), key.current);
    setBusy(false);
    if (error) { toast.error(errText(t, error.message)); return; }
    toast.success(t("stk.received_ok")); done(); onDone();
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5"><Label>{t("stk.qty")}</Label><Input inputMode="numeric" value={f.qty} onChange={(e) => setF({ ...f, qty: digits(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label>{t("stk.unit_cost")}</Label><Input inputMode="numeric" placeholder={t("stk.optional")} value={f.unitCost} onChange={(e) => setF({ ...f, unitCost: digits(e.target.value) })} /></div>
      </div>
      <p className="text-xs text-muted-foreground">{t("stk.cost_hint")}</p>
      <div className="space-y-1.5"><Label>{t("stk.supplier")}</Label><Input maxLength={80} placeholder={t("stk.optional")} value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>{t("stk.reference")}</Label><Input maxLength={60} placeholder={t("stk.optional")} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></div>
      {f.qty && !errs.length && <p className="text-sm">{t("stk.after", { n: product.stock + Number(f.qty) })}</p>}
      <Button className="h-11 w-full" disabled={busy || !!errs.length} onClick={go}>{busy ? t("common.loading") : t("stk.receive_save")}</Button>
    </div>
  );
}

function AdjustForm({ product, onDone }: { product: P; onDone: () => void }) {
  const { t } = useApp();
  const done = useDone();
  const [f, setF] = useState<{ count: string; reason: AdjustReason | ""; note: string }>({ count: "", reason: "", note: "" });
  const key = useRef(newStockKey());
  useEffect(() => { key.current = newStockKey(); }, [f.count, f.reason]);
  const errs = validateAdjust(f, product.stock);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (errs.length) { toast.error(t(`stk.v.${errs[0]}` as TKey)); return; }
    setBusy(true);
    const { error } = await stock.adjust(product.id, Number(f.count), f.reason as AdjustReason, f.note.trim(), key.current);
    setBusy(false);
    if (error) { toast.error(errText(t, error.message)); return; }
    toast.success(t("stk.adjusted_ok")); done(); onDone();
  };
  const diff = f.count ? Number(f.count) - product.stock : 0;
  return (
    <div className="space-y-3">
      <p className="text-sm">{t("stk.now", { n: product.stock })}</p>
      <div className="space-y-1.5"><Label>{t("stk.counted")}</Label><Input inputMode="numeric" value={f.count} onChange={(e) => setF({ ...f, count: digits(e.target.value) })} /></div>
      {f.count && diff !== 0 && <p className={`text-sm font-medium ${diff < 0 ? "text-destructive" : "text-primary"}`}>{diff > 0 ? `+${diff}` : diff}</p>}
      <div className="space-y-1.5"><Label>{t("stk.reason")}</Label>
        <div className="flex flex-wrap gap-2">
          {ADJUST_REASONS.map((r) => (
            <button key={r} type="button" aria-pressed={f.reason === r} onClick={() => setF({ ...f, reason: r })}
              className={`min-h-9 rounded-full border px-3 text-sm ${f.reason === r ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card"}`}>{t(`stk.r.${r}` as TKey)}</button>
          ))}
        </div></div>
      <div className="space-y-1.5"><Label>{t("stk.note")}{f.reason === "other" ? " *" : ""}</Label><Textarea rows={2} maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
      <Button className="h-11 w-full" disabled={busy || !!errs.length} onClick={go}>{busy ? t("common.loading") : t("stk.adjust_save")}</Button>
    </div>
  );
}

function CostEdit({ productId, current }: { productId: string; current: number | null }) {
  const { t } = useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  useEffect(() => { setV(current == null ? "" : String(current)); }, [current]);
  const save = async () => {
    const { error } = await stock.setCost(productId, parseUnitCost(v));
    if (error) { toast.error(errText(t, error.message)); return; }
    toast.success(t("account.saved")); setOpen(false); qc.invalidateQueries({ queryKey: ["product-cost", productId] });
  };
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-primary">{t("stk.set_cost")}</button>;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input inputMode="numeric" placeholder={t("stk.cost_unknown")} value={v} onChange={(e) => setV(digits(e.target.value))} />
        <Button type="button" variant="outline" onClick={save}>{t("common.save")}</Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("stk.cost_future")}</p>
    </div>
  );
}
