import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Printer, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import {
  PAY_METHODS,
  type PayMethod,
  cashChange,
  changedPrices,
  effectivePrice,
  formatMMK,
  yangonDay,
} from "@/lib/domain/rules";
import { pos, notInstalled, type Movement } from "@/lib/pos";
import type { TKey } from "@/lib/i18n/dict";
import { MediaImg, EmptyState } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Line = {
  productId: string;
  name: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  stock: number;
};
const newKey = () => crypto.randomUUID();
/** No answer from the server (dropped connection, timeout, relay error): outcome unknown. */
const isNetwork = (e: { message: string; code?: string }) =>
  !e.code &&
  /failed to fetch|networkerror|network request failed|load failed|aborted/i.test(e.message ?? "");

export function PosSell({ shopId }: { shopId: string }) {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const products = useQuery({
    queryKey: ["pos-products", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,sku,barcode,price,sale_price,stock,images")
        .eq("shop_id", shopId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  const day = useQuery({ queryKey: ["pos-day", shopId], queryFn: () => pos.day(shopId) });
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState<PayMethod>("cash");
  const [cash, setCash] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState<string[]>([]);
  // true after a network failure with unknown outcome: the cart is frozen so the retry sends the exact same request.
  const [uncertain, setUncertain] = useState(false);
  const [done, setDone] = useState<{ id: string; n: number; change: number | null } | null>(null);
  const key = useRef(newKey()); // same key for this cart across retries
  const searchRef = useRef<HTMLInputElement>(null);

  const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const received = method === "cash" && cash ? Number(cash) : null;
  const change = cashChange(method, total, received);
  const needle = q.trim().toLowerCase();
  const matches = useMemo(
    () =>
      !needle
        ? []
        : (products.data ?? [])
            .filter(
              (p) =>
                p.name.toLowerCase().includes(needle) ||
                (p.sku ?? "").toLowerCase().includes(needle) ||
                (p.barcode ?? "").includes(needle),
            )
            .slice(0, 8),
    [needle, products.data],
  );

  if (notInstalled(day.data?.error ?? null)) return <EmptyState text={t("pos.setup")} />;

  const add = (p: NonNullable<typeof products.data>[number]) => {
    if (uncertain) return;
    if (effectivePrice(p) <= 0) {
      toast.error(`${t("pos.zero_price")}: ${p.name}`);
      return;
    }
    const cur = lines.find((l) => l.productId === p.id)?.quantity ?? 0;
    if (cur + 1 > p.stock) {
      toast.error(`${t("pos.no_stock")}: ${p.name}`);
      return;
    }
    setLines(
      cur
        ? lines.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [
            ...lines,
            {
              productId: p.id,
              name: p.name,
              image: p.images[0] ?? null,
              unitPrice: effectivePrice(p),
              quantity: 1,
              stock: p.stock,
            },
          ],
    );
    setQ("");
    searchRef.current?.focus();
  };
  const onEnter = () => {
    const exact =
      (products.data ?? []).find((p) => p.barcode && p.barcode === q.trim()) ??
      (matches.length === 1 ? matches[0] : undefined);
    if (exact) add(exact);
    else if (q.trim()) toast.error(t("pos.not_found"));
  };
  const setQty = (id: string, n: number) =>
    !uncertain &&
    setLines(
      n <= 0
        ? lines.filter((l) => l.productId !== id)
        : lines.map((l) => (l.productId === id ? { ...l, quantity: Math.min(n, l.stock) } : l)),
    );

  const finish = async () => {
    if (change === "too_low" || !lines.length) return;
    setBusy(true);
    try {
      if (!changed.length && !uncertain) {
        // Refresh prices first; if any differ, show them and ask before selling.
        const { data: fresh, error } = await supabase
          .from("products")
          .select("id,price,sale_price,stock")
          .in(
            "id",
            lines.map((l) => l.productId),
          );
        if (error) throw error;
        const cur = Object.fromEntries((fresh ?? []).map((p) => [p.id, effectivePrice(p)]));
        const diff = changedPrices(lines, cur);
        if (diff.length) {
          setLines(lines.map((l) => ({ ...l, unitPrice: cur[l.productId] ?? l.unitPrice })));
          setChanged(diff.map((d) => d.productId));
          key.current = newKey();
          toast.warning(t("pos.price_changed"));
          return;
        }
      }
      const { data, error } = await pos.checkout({
        shopId,
        items: lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
        payment: method,
        cash: received,
        expectedTotal: total,
        key: key.current,
      });
      if (error) {
        if (isNetwork(error)) throw error;
        // Definite answer from the database: nothing was saved under this key, so the cart can change again.
        setUncertain(false);
        key.current = newKey();
        const code = error.message.split(":")[0];
        const pid = error.message.split(":")[1];
        if (code === "ZERO_PRICE") {
          toast.error(
            `${t("pos.zero_price")}: ${lines.find((l) => l.productId === pid)?.name ?? ""}`,
          );
          return;
        }
        if (code === "IDEMPOTENCY_MISMATCH") {
          toast.error(t("pos.mismatch"));
          return;
        }
        if (code === "PRICE_CHANGED") {
          setChanged([]);
          toast.warning(t("pos.price_changed"));
          qc.invalidateQueries({ queryKey: ["pos-products", shopId] });
          return;
        }
        if (code === "OUT_OF_STOCK") {
          toast.error(
            `${t("pos.no_stock")}: ${lines.find((l) => l.productId === pid)?.name ?? ""}`,
          );
          return;
        }
        if (code === "CASH_TOO_LOW") {
          toast.error(t("pos.too_low"));
          return;
        }
        console.error("pos_checkout", error);
        toast.error(`${t("err.generic")} (${error.code || ""} ${error.message})`.trim());
        return;
      }
      setDone({ id: data!.sale_id, n: data!.sale_number, change: data!.change_due });
      setLines([]);
      setCash("");
      setChanged([]);
      setUncertain(false);
      key.current = newKey();
      qc.invalidateQueries({ queryKey: ["pos-day", shopId] });
      qc.invalidateQueries({ queryKey: ["pos-products", shopId] });
      qc.invalidateQueries({ queryKey: ["my-products", shopId] });
    } catch (e) {
      console.error("pos_checkout network", e);
      setUncertain(true); // key and cart kept as-is: retry returns the saved sale instead of a second one
      toast.error(
        `${t("pos.retrying")} (${e instanceof Error ? e.message : ((e as { message?: string })?.message ?? "")})`,
      );
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="surface mx-auto max-w-md space-y-4 p-6 text-center">
        <p className="font-display text-2xl font-semibold">{t("pos.done", { n: done.n })}</p>
        {done.change != null && (
          <p className="text-lg">
            {t("pos.change")}: <b className="tabular-nums">{formatMMK(done.change, lang)}</b>
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-11">
            <Link to="/receipt/$id" params={{ id: done.id }}>
              <Printer className="size-4" />
              {t("pos.receipt")}
            </Link>
          </Button>
          <Button
            className="h-11"
            onClick={() => {
              setDone(null);
              setTimeout(() => searchRef.current?.focus(), 0);
            }}
          >
            {t("pos.new_sale")}
          </Button>
        </div>
      </div>
    );

  const cartList = !lines.length ? (
    <p className="py-6 text-center text-sm text-muted-foreground">{t("pos.empty")}</p>
  ) : (
    <ul className="divide-y">
      {lines.map((l) => (
        <li
          key={l.productId}
          className={`flex items-center gap-2 py-2 ${changed.includes(l.productId) ? "rounded bg-gold-soft/60 px-2" : ""}`}
        >
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 text-sm font-medium">{l.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatMMK(l.unitPrice, lang)}
            </span>
          </span>
          <Button
            size="icon"
            variant="outline"
            className="size-11 rounded-xl"
            disabled={uncertain}
            onClick={() => setQty(l.productId, l.quantity - 1)}
            aria-label={t("pos.decrease")}
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-7 text-center tabular-nums">{l.quantity}</span>
          <Button
            size="icon"
            variant="outline"
            className="size-11 rounded-xl"
            onClick={() => setQty(l.productId, l.quantity + 1)}
            disabled={uncertain || l.quantity >= l.stock}
            aria-label={t("pos.increase")}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-11 rounded-xl"
            disabled={uncertain}
            onClick={() => setQty(l.productId, 0)}
            aria-label={t("pos.remove")}
          >
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
  const checkoutPanel = (
    <div className="space-y-4">
      {" "}
      <div className="max-h-[40vh] overflow-y-auto">
        <p className="mb-2 text-sm font-semibold">{t("pos.cart")}</p>
        {cartList}
      </div>
      <div className="border-t border-border/70" />
      <p className="text-sm font-semibold">{t("pos.pay")}</p>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {PAY_METHODS.map((m) => (
          <Button
            variant="ghost"
            key={m}
            type="button"
            aria-pressed={method === m}
            className={`min-h-11 whitespace-normal rounded-xl px-2 text-sm font-medium transition disabled:opacity-50 ${method === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            disabled={uncertain}
            onClick={() => {
              setMethod(m);
              if (m !== "cash") setCash("");
            }}
          >
            {t(`pay.${m}` as TKey)}
          </Button>
        ))}
      </div>
      {method === "cash" && (
        <div className="space-y-1.5">
          <Label htmlFor="pos-cash" className="text-xs">
            {t("pos.received")}
          </Label>
          <Input
            id="pos-cash"
            inputMode="numeric"
            className="h-11"
            disabled={uncertain}
            value={cash}
            onChange={(e) => setCash(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      )}
      <div className="flex items-baseline justify-between border-t pt-3">
        <span>{t("pos.total")}</span>
        <b className="text-2xl tabular-nums">{formatMMK(total, lang)}</b>
      </div>
      {typeof change === "number" && (
        <p className="flex justify-between text-sm">
          <span>{t("pos.change")}</span>
          <b className="tabular-nums">{formatMMK(change, lang)}</b>
        </p>
      )}
      {change === "too_low" && <p className="text-sm text-destructive">{t("pos.too_low")}</p>}
      {uncertain && <p className="rounded-md bg-gold-soft/60 p-2 text-sm">{t("pos.locked")}</p>}
      {changed.length > 0 && (
        <p className="text-sm text-gold-foreground">{t("pos.price_changed")}</p>
      )}
      <Button
        className="h-12 w-full text-base"
        disabled={busy || !lines.length || change === "too_low"}
        onClick={finish}
      >
        {uncertain ? t("pos.retry") : changed.length ? t("pos.confirm_new") : t("pos.finish")}
      </Button>
    </div>
  );
  const displayedProducts = needle ? matches : (products.data ?? []);
  const itemCount = lines.reduce((a, l) => a + l.quantity, 0);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 pb-20 md:grid-cols-[minmax(0,1fr)_22rem] md:pb-0">
        <div className="min-w-0 space-y-3">
          <Input
            ref={searchRef}
            autoFocus
            disabled={uncertain}
            className="h-12 rounded-xl text-base"
            placeholder={t("pos.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnter();
              }
            }}
          />
          {displayedProducts.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {displayedProducts.map((p) => (
                <li key={p.id}>
                  <button
                    disabled={uncertain || p.stock <= 0}
                    aria-label={t("pos.add_item", { name: p.name })}
                    onClick={() => add(p)}
                    className="flex h-full w-full flex-col gap-2 rounded-2xl border border-border/70 bg-card p-2.5 text-left transition hover:border-primary/50 disabled:opacity-50"
                  >
                    <MediaImg
                      path={p.images[0]}
                      alt=""
                      className="aspect-square w-full rounded-xl bg-card"
                    />
                    <span className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug">
                      {p.name}
                    </span>
                    <span className="mt-auto flex w-full flex-wrap items-center justify-between gap-1">
                      <span className="font-semibold tabular-nums">
                        {formatMMK(effectivePrice(p), lang)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${p.stock > 0 ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}
                      >
                        {p.stock}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          id="pos-checkout"
          className="hidden h-fit rounded-2xl border border-border/70 bg-card p-4 md:sticky md:top-36 md:block"
        >
          {checkoutPanel}
        </div>
      </div>
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <div className="pos-checkout-bar fixed inset-x-0 z-30 border-t border-border bg-card p-3 md:hidden">
          <Button
            className="flex min-h-12 h-auto w-full flex-wrap justify-between rounded-xl px-4 py-3"
            onClick={() => setCartOpen(true)}
          >
            <span className="tabular-nums">
              {t("pos.items_n", { n: itemCount })} · {formatMMK(total, lang)}
            </span>
            <span>{t("pos.finish")}</span>
          </Button>
        </div>
        <SheetContent
          side="bottom"
          aria-describedby={undefined}
          className="pos-payment-sheet max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-card"
        >
          <SheetHeader className="mb-4 text-left">
            <SheetTitle>{t("pos.cart")}</SheetTitle>
          </SheetHeader>
          {checkoutPanel}
        </SheetContent>
      </Sheet>
      <PosDay shopId={shopId} />
    </div>
  );
}

function PosDay({ shopId }: { shopId: string }) {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const today = yangonDay();
  const [d, setD] = useState(today);
  const q = useQuery({
    queryKey: d === today ? ["pos-day", shopId] : ["pos-day", shopId, d],
    queryFn: () => pos.day(shopId, d),
  });
  const [voiding, setVoiding] = useState<string | null>(null);
  const day = q.data?.data;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{d === today ? t("pos.today") : t("pos.history")}</h3>
        <Input
          type="date"
          className="h-10 w-auto"
          value={d}
          max={today}
          onChange={(e) => setD(e.target.value || today)}
        />
      </div>
      {day && (
        <div className="surface grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs text-muted-foreground">{t("pos.total")}</p>
            <p className="text-xl font-semibold tabular-nums">{formatMMK(day.revenue, lang)}</p>
            <p className="text-xs text-muted-foreground">
              {t("pos.sales_n", { n: day.count })}
              {day.voided ? ` · ${t("pos.voided_n", { n: day.voided })}` : ""}
            </p>
          </div>
          {PAY_METHODS.map((m) => (
            <div key={m}>
              <p className="text-xs text-muted-foreground">{t(`pay.${m}` as TKey)}</p>
              <p className="font-medium tabular-nums">{formatMMK(day.by_method[m] ?? 0, lang)}</p>
            </div>
          ))}
        </div>
      )}
      {day && !day.sales.length ? (
        <EmptyState text={t("pos.no_sales")} />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {(day?.sales ?? []).map((s) => (
            <li key={s.id} className="flex items-center gap-2 p-3">
              <Link
                to="/receipt/$id"
                params={{ id: s.id }}
                className="min-w-0 flex-1 hover:text-primary"
              >
                <p
                  className={`font-medium ${s.status === "voided" ? "line-through opacity-60" : ""}`}
                >
                  #{s.sale_number} · {formatMMK(s.total, lang)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`pay.${s.payment_method}` as TKey)} ·{" "}
                  {new Date(s.created_at).toLocaleTimeString(undefined, {
                    timeZone: "Asia/Yangon",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {s.status === "voided" ? ` · ${t("pos.voided")}` : ""}
                </p>
              </Link>
              {s.status === "completed" && (
                <Button size="sm" variant="ghost" onClick={() => setVoiding(s.id)}>
                  <Ban className="size-4" />
                  {t("pos.void")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <VoidDialog
        id={voiding}
        onClose={(ok) => {
          setVoiding(null);
          if (ok) {
            qc.invalidateQueries({ queryKey: ["pos-day", shopId] });
            qc.invalidateQueries({ queryKey: ["pos-products", shopId] });
          }
        }}
      />
    </div>
  );
}

function VoidDialog({ id, onClose }: { id: string | null; onClose: (ok: boolean) => void }) {
  const { t } = useApp();
  const [reason, setReason] = useState("");
  const [back, setBack] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setReason("");
    setBack(false);
  }, [id]);
  const go = async () => {
    setBusy(true);
    const { error } = await pos.void(id!, reason, back);
    setBusy(false);
    if (error && !/ALREADY_VOIDED/.test(error.message)) {
      toast.error(t("err.generic"));
      return;
    }
    toast.success(t("pos.void_ok"));
    onClose(true);
  };
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("pos.void")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("pos.void_reason")}</Label>
            <Textarea
              rows={2}
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={back}
              onCheckedChange={(v) => setBack(v === true)}
              className="mt-0.5"
            />
            {t("pos.void_back")}
          </label>
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {t("pos.void_note")}
          </p>
          <Button
            variant="destructive"
            className="h-11 w-full"
            disabled={busy || !back || !reason.trim()}
            onClick={go}
          >
            {t("pos.void")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StockHistory({ productId }: { productId: string }) {
  const { t } = useApp();
  const q = useQuery({
    queryKey: ["stock-moves", productId],
    queryFn: () => pos.movements(productId),
  });
  if (!q.data || notInstalled(q.data.error) || !q.data.data.length) return null;
  const rows: Movement[] = q.data.data;
  const first = rows.find((r) => r.reason === "opening_balance");
  return (
    <details className="rounded-md border p-3 text-sm">
      <summary className="cursor-pointer font-medium">{t("stock.history")}</summary>
      {first && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("stock.since", { d: new Date(first.created_at).toLocaleDateString() })}
        </p>
      )}
      <ul className="mt-2 divide-y">
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between gap-2 py-1.5">
            <span>
              {t(`stock.r.${r.reason}` as TKey)}
              <span className="block text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </span>
            </span>
            <span className="text-right tabular-nums">
              <b className={r.delta < 0 ? "text-destructive" : "text-primary"}>
                {r.delta > 0 ? `+${r.delta}` : r.delta}
              </b>
              <span className="block text-xs text-muted-foreground">= {r.stock_after}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
