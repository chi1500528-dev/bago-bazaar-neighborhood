import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { formatMMK, PAY_METHODS } from "@/lib/domain/rules";
import {
  presetRange,
  validRange,
  fullByMethod,
  methodsReconcile,
  posCsv,
  ordersCsv,
  RANGE_PRESETS,
  exportLimited,
  sortTop,
  EXPORT_ROW_CAP,
  type RangePreset,
  type DayRange,
} from "@/lib/domain/reports";
import { reports, type TopRow } from "@/lib/reports";
import { notInstalled } from "@/lib/pos";
import { stock } from "@/lib/stock";
import { profitView } from "@/lib/domain/stock";
import type { TKey } from "@/lib/i18n/dict";
import { EmptyState } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MerchantReports({ shopId }: { shopId: string }) {
  const { t } = useApp();
  const [preset, setPreset] = useState<RangePreset>("today");
  const [custom, setCustom] = useState<DayRange>(presetRange("last7"));
  const range = preset === "custom" ? custom : presetRange(preset);
  const ok = validRange(range);
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 [scrollbar-width:none]">
          {RANGE_PRESETS.map((p) => (
            <Button
              variant="ghost"
              key={p}
              type="button"
              aria-pressed={preset === p}
              className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium transition ${preset === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setPreset(p)}
            >
              {t(`rep.${p}` as TKey)}
            </Button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>{t("rep.from")}</span>
            <Input
              type="date"
              className="w-auto"
              value={custom.start}
              onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))}
            />
            <span>{t("rep.to")}</span>
            <Input
              type="date"
              className="w-auto"
              value={custom.end}
              onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {range.start === range.end ? range.start : `${range.start} → ${range.end}`} ·{" "}
          {t("rep.tz_note")}
        </p>
      </div>
      {!ok ? (
        <p className="text-sm text-destructive">{t("rep.bad_range")}</p>
      ) : (
        <Tabs defaultValue="pos">
          <TabsList className="h-auto rounded-xl">
            <TabsTrigger value="pos" className="min-h-11 rounded-xl">
              {t("rep.pos")}
            </TabsTrigger>
            <TabsTrigger value="mkt" className="min-h-11 rounded-xl">
              {t("rep.mkt")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pos">
            <PosReportView shopId={shopId} range={range} />
          </TabsContent>
          <TabsContent value="mkt">
            <OrdersReportView shopId={shopId} range={range} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Note({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "gold";
}) {
  return (
    <p
      className={`flex gap-2 rounded-md p-3 text-xs ${tone === "gold" ? "bg-gold-soft text-gold-foreground" : "bg-muted text-muted-foreground"}`}
    >
      <Info className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}

function Top({ rows }: { rows: TopRow[] }) {
  const { t, lang } = useApp();
  if (!rows.length) return null;
  return (
    <div className="border-t py-5">
      <h3 className="mb-2 font-semibold">{t("rep.top")}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="py-1 font-normal"></th>
            <th className="font-normal text-right">{t("rep.qty")}</th>
            <th className="font-normal text-right">{t("rep.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {sortTop(rows).map((r) => (
            <tr key={r.name} className="border-t">
              <td className="py-1.5 pr-2">{r.name}</td>
              <td className="text-right tabular-nums">{r.qty}</td>
              <td className="text-right tabular-nums">{formatMMK(r.total, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PosReportView({ shopId, range }: { shopId: string; range: DayRange }) {
  const { t, lang } = useApp();
  const q = useQuery({
    queryKey: ["rep-pos", shopId, range.start, range.end],
    queryFn: () => reports.pos(shopId, range),
  });
  if (q.isLoading)
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (notInstalled(q.data?.error ?? null)) return <EmptyState text={t("rep.setup")} />;
  const d = q.data?.data;
  if (!d) return <EmptyState text={t("err.generic")} />;
  const m = fullByMethod(d.by_method);
  const rec = methodsReconcile(m, d.completed_total);
  const reasons = d.sales.filter((s) => s.status === "voided" && s.void_reason);
  return (
    <div className="mt-3 space-y-4">
      <div className="border-b pb-5">
        <p className="text-sm text-muted-foreground">{t("rep.pos_total")}</p>
        <p className="text-3xl font-semibold tabular-nums">{formatMMK(d.completed_total, lang)}</p>
        <p className="text-sm text-muted-foreground">
          {t("rep.tickets", { n: d.completed_count })}
        </p>
      </div>
      <div className="space-y-4 border-t py-5">
        <h3 className="font-semibold">{t("rep.by_method")}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PAY_METHODS.map((k) => (
            <div key={k} className="min-w-0 border-l pl-3">
              <p className="text-xs text-muted-foreground">{t(`pay.${k}` as TKey)}</p>
              <p className="break-words font-semibold tabular-nums">{formatMMK(m[k], lang)}</p>
            </div>
          ))}
        </div>
        <p
          className={`flex items-center gap-1.5 text-xs ${rec ? "text-primary" : "text-destructive"}`}
        >
          {rec ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
          {t(rec ? "rep.reconciled" : "rep.not_reconciled")}
        </p>
        <Note tone="gold">{t("rep.method_note")}</Note>
      </div>
      <div className="space-y-3 border-t py-5">
        <h3 className="font-semibold">{t("rep.voided")}</h3>
        <div className="flex flex-wrap gap-6 text-sm">
          <span>
            {t("rep.voided_count")}: <b className="tabular-nums">{d.voided_count}</b>
          </span>
          <span>
            {t("rep.voided_value")}:{" "}
            <b className="tabular-nums">{formatMMK(d.voided_value, lang)}</b>
          </span>
        </div>
        {reasons.length > 0 && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">{t("rep.reasons")}</p>
            <ul className="list-disc pl-5">
              {reasons.slice(0, 20).map((s) => (
                <li key={s.sale_number}>
                  #{s.sale_number} — {s.void_reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Note>{t("rep.void_note")}</Note>
      </div>
      <ProfitPanel shopId={shopId} range={range} channel="pos" />
      <Top rows={d.top_products} />
      {d.sales.length === 0 ? (
        <EmptyState text={t("rep.empty")} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => download(`pos-${range.start}_${range.end}.csv`, posCsv(d.sales))}
          >
            <Download className="size-4" />
            {t("rep.csv")}
          </Button>
          <span className="text-xs text-muted-foreground">{t("rep.csv_note")}</span>
          {exportLimited(d.sales.length, d.sales_row_count) && (
            <p className="flex w-full items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="size-4" />
              {t("rep.csv_limited", {
                n: d.sales.length,
                total: Number(d.sales_row_count),
                cap: EXPORT_ROW_CAP,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const PIPE = ["pending", "confirmed", "preparing", "ready", "out_for_delivery"] as const;

function OrdersReportView({ shopId, range }: { shopId: string; range: DayRange }) {
  const { t, lang } = useApp();
  const q = useQuery({
    queryKey: ["rep-orders", shopId, range.start, range.end],
    queryFn: () => reports.orders(shopId, range),
  });
  if (q.isLoading)
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (notInstalled(q.data?.error ?? null)) return <EmptyState text={t("rep.setup")} />;
  const d = q.data?.data;
  if (!d) return <EmptyState text={t("err.generic")} />;
  const cancelled = d.pipeline["cancelled"];
  return (
    <div className="mt-3 space-y-4">
      <div className="space-y-4 border-b pb-5">
        <div>
          <p className="text-sm text-muted-foreground">{t("rep.mkt_value")}</p>
          <p className="text-3xl font-semibold tabular-nums">
            {formatMMK(d.completed_value, lang)}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("rep.orders_n", { n: d.completed_count })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="min-w-0 border-l pl-3">
            <p className="text-xs text-muted-foreground">{t("rep.subtotal")}</p>
            <p className="break-words font-semibold tabular-nums">
              {formatMMK(d.merchandise_subtotal, lang)}
            </p>
          </div>
          <div className="min-w-0 border-l pl-3">
            <p className="text-xs text-muted-foreground">{t("rep.fees")}</p>
            <p className="break-words font-semibold tabular-nums">
              {formatMMK(d.delivery_fees, lang)}
            </p>
          </div>
        </div>
        <Note tone="gold">{t("rep.mkt_note")}</Note>
        <p className="text-xs text-muted-foreground">{t("rep.mkt_dating")}</p>
      </div>
      <div className="border-t py-5">
        <h3 className="mb-2 font-semibold">{t("rep.pipeline")}</h3>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          {PIPE.map((s) => (
            <div key={s} className="min-w-0 border-l pl-3">
              <p className="text-xs text-muted-foreground">{t(`status.${s}` as TKey)}</p>
              <p className="break-words font-semibold tabular-nums">{d.pipeline[s]?.count ?? 0}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm">
          {t("rep.cancelled")}: <b className="tabular-nums">{cancelled?.count ?? 0}</b> ·{" "}
          {formatMMK(cancelled?.subtotal ?? 0, lang)}
        </p>
      </div>
      <ProfitPanel shopId={shopId} range={range} channel="online" />
      <Top rows={d.top_products} />
      {d.orders.length === 0 ? (
        <EmptyState text={t("rep.empty")} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => download(`orders-${range.start}_${range.end}.csv`, ordersCsv(d.orders))}
          >
            <Download className="size-4" />
            {t("rep.csv")}
          </Button>
          <span className="text-xs text-muted-foreground">{t("rep.csv_note")}</span>
          {exportLimited(d.orders.length, d.orders_row_count) && (
            <p className="flex w-full items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="size-4" />
              {t("rep.csv_limited", {
                n: d.orders.length,
                total: Number(d.orders_row_count),
                cap: EXPORT_ROW_CAP,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Gross profit only on sold lines with a saved cost; channel-separated; never net profit. */
function ProfitPanel({
  shopId,
  range,
  channel,
}: {
  shopId: string;
  range: DayRange;
  channel: "pos" | "online";
}) {
  const { t, lang } = useApp();
  const q = useQuery({
    queryKey: ["rep-profit", shopId, range.start, range.end],
    queryFn: () => stock.profit(shopId, range),
  });
  const f = q.data?.data?.[channel];
  if (!f) return null;
  const v = profitView(f);
  if (v.kind === "none" && v.reason === "no_sales") return null;
  return (
    <div className="space-y-4 border-t py-5">
      <h3 className="font-semibold">{t("pf.title")}</h3>
      {v.kind === "none" ? (
        <Note tone="gold">{t("pf.no_cost")}</Note>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="min-w-0 border-l pl-3">
              <p className="text-xs text-muted-foreground">{t("pf.sales")}</p>
              <p className="break-words font-semibold tabular-nums">
                {formatMMK(f.known_cost_sales, lang)}
              </p>
            </div>
            <div className="min-w-0 border-l pl-3">
              <p className="text-xs text-muted-foreground">{t("pf.cogs")}</p>
              <p className="break-words font-semibold tabular-nums">
                {formatMMK(f.known_cost, lang)}
              </p>
            </div>
            <div className="min-w-0 border-l pl-3">
              <p className="text-xs text-muted-foreground">{t("pf.gross")}</p>
              <p className="break-words font-semibold tabular-nums">
                {formatMMK(v.grossOnKnown, lang)}
              </p>
            </div>
          </div>
          {v.kind === "partial" && (
            <Note tone="gold">
              {t("pf.unknown", {
                amt: formatMMK(v.uncoveredSales, lang),
                pct: Math.round((1 - v.coveredShare) * 100),
              })}
            </Note>
          )}
        </>
      )}
      <Note>{t("pf.no_net")}</Note>
    </div>
  );
}
