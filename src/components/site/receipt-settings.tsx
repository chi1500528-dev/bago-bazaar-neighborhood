import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApp } from "@/lib/app-state";
import {
  normalizeReceipt,
  RECEIPT_DEFAULTS,
  HEADER_MAX,
  FOOTER_MAX,
  type ReceiptSettings,
} from "@/lib/domain/reports";
import { reports } from "@/lib/reports";
import { notInstalled } from "@/lib/pos";
import { ReceiptPaper, type PaperShop } from "@/components/site/receipt-paper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function ReceiptSettingsCard({ shopId, shop }: { shopId: string; shop: PaperShop }) {
  const { t } = useApp();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["receipt-settings", shopId],
    queryFn: () => reports.receiptSettings(shopId),
  });
  const [s, setS] = useState<ReceiptSettings>(RECEIPT_DEFAULTS);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data && !q.data.error) setS(normalizeReceipt(q.data.data));
  }, [q.data]);
  if (q.isLoading) return null;
  if (notInstalled(q.data?.error ?? null))
    return (
      <section className="surface p-5">
        <h2 className="mb-1 font-semibold">{t("rcpt.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("rep.setup")}</p>
      </section>
    );
  const set = <K extends keyof ReceiptSettings>(k: K, v: ReceiptSettings[K]) =>
    setS((o) => ({ ...o, [k]: v }));
  const save = async () => {
    setBusy(true);
    const { error } = await reports.saveReceiptSettings(shopId, normalizeReceipt(s));
    setBusy(false);
    if (error) {
      toast.error(t("err.generic"));
      return;
    }
    toast.success(t("rcpt.saved"));
    qc.invalidateQueries({ queryKey: ["receipt-settings", shopId] });
  };
  const toggle = (k: "show_logo" | "show_phone" | "show_address", label: string) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Switch checked={s[k]} onCheckedChange={(v) => set(k, v)} />
    </label>
  );
  return (
    <section className="surface mt-5 grid gap-5 p-5 md:grid-cols-2">
      <div className="space-y-4">
        <h2 className="font-semibold">{t("rcpt.title")}</h2>
        {toggle("show_logo", t("rcpt.show_logo"))}
        {s.show_logo && !shop.logo_url && (
          <p className="text-xs text-muted-foreground">{t("rcpt.no_logo")}</p>
        )}
        <div className="space-y-1.5">
          <Label>{t("rcpt.lang")}</Label>
          <div className="flex gap-2">
            {(["my", "en"] as const).map((l) => (
              <Button
                key={l}
                type="button"
                size="sm"
                variant={s.lang === l ? "default" : "outline"}
                onClick={() => set("lang", l)}
              >
                {l === "my" ? "မြန်မာ" : "English"}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t("pos.width")}</Label>
          <div className="flex gap-2">
            {([58, 80] as const).map((w) => (
              <Button
                key={w}
                type="button"
                size="sm"
                variant={s.paper_width === w ? "default" : "outline"}
                onClick={() => set("paper_width", w)}
              >
                {w}mm
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t("rcpt.header")}</Label>
          <Textarea
            rows={2}
            maxLength={HEADER_MAX}
            value={s.header_note}
            onChange={(e) => set("header_note", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("rcpt.footer")}</Label>
          <Textarea
            rows={2}
            maxLength={FOOTER_MAX}
            value={s.footer_note}
            onChange={(e) => set("footer_note", e.target.value)}
          />
        </div>
        {toggle("show_phone", t("rcpt.show_phone"))}
        {toggle("show_address", t("rcpt.show_address"))}
        <Button onClick={save} disabled={busy}>
          {t("common.save")}
        </Button>
      </div>
      <div>
        <p className="mb-2 text-sm text-muted-foreground">{t("rcpt.preview")}</p>
        <div className="overflow-x-auto rounded-lg border bg-muted p-3">
          <ReceiptPaper
            shop={shop}
            s={s}
            sale={{
              sale_number: 1,
              created_at: new Date().toISOString(),
              status: "completed",
              payment_method: "cash",
              total: 5000,
              cash_received: 10000,
              change_due: 5000,
            }}
            items={[
              { id: "x", name: t("rcpt.sample"), quantity: 2, unit_price: 2500, line_total: 5000 },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
