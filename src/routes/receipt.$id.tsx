import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/site/shell";
import { useApp } from "@/lib/app-state";
import { formatMMK } from "@/lib/domain/rules";
import { pos } from "@/lib/pos";
import type { TKey } from "@/lib/i18n/dict";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/bits";

export const Route = createFileRoute("/receipt/$id")({
  head: () => ({
    meta: [
      { title: "Receipt · Bago Market" },
      { name: "description", content: "Printable in-store sale receipt for Bago Market shops." },
      { property: "og:title", content: "Receipt · Bago Market" },
      { property: "og:description", content: "In-store sale receipt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <RequireAuth><Receipt /></RequireAuth>,
});

function Receipt() {
  const { id } = Route.useParams();
  const { t, lang } = useApp();
  const [w, setW] = useState<58 | 80>(80);
  const q = useQuery({
    queryKey: ["receipt", id],
    queryFn: async () => {
      const r = await pos.sale(id);
      const shop = r.sale ? (await supabase.from("shops").select("name,phone,address").eq("id", r.sale.shop_id).maybeSingle()).data : null;
      return { ...r, shop };
    },
  });
  if (q.isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  const s = q.data?.sale;
  if (!s) return <EmptyState text={t("err.generic")} />;
  return (
    <div className="mx-auto max-w-md py-6">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <span className="ml-auto text-sm text-muted-foreground">{t("pos.width")}</span>
        {([58, 80] as const).map((x) => <Button key={x} size="sm" variant={w === x ? "default" : "outline"} onClick={() => setW(x)}>{x}mm</Button>)}
        <Button size="sm" onClick={() => window.print()}><Printer className="size-4" />{t("pos.print")}</Button>
      </div>
      <div className="receipt mx-auto bg-card p-3 font-mono text-xs leading-relaxed text-foreground" style={{ width: `${w}mm` }}>
        <p className="text-center text-sm font-bold">{q.data!.shop?.name}</p>
        {q.data!.shop?.phone && <p className="text-center">{q.data!.shop.phone}</p>}
        <p className="mt-2">{t("pos.sale_no")} #{s.sale_number}</p>
        <p>{new Date(s.created_at).toLocaleString(undefined, { timeZone: "Asia/Yangon" })}</p>
        {s.status === "voided" && <p className="mt-1 text-center font-bold">*** {t("pos.voided")} ***</p>}
        <div className="my-2 border-t border-dashed" />
        {q.data!.items.map((i) => <div key={i.id} className="mb-1">
          <p>{i.name}</p>
          <p className="flex justify-between"><span>{i.quantity} × {formatMMK(i.unit_price, lang)}</span><span>{formatMMK(i.line_total, lang)}</span></p>
        </div>)}
        <div className="my-2 border-t border-dashed" />
        <p className="flex justify-between font-bold"><span>{t("pos.total")}</span><span>{formatMMK(s.total, lang)}</span></p>
        <p className="flex justify-between"><span>{t("pos.pay")}</span><span>{t(`pay.${s.payment_method}` as TKey)}</span></p>
        {s.cash_received != null && <p className="flex justify-between"><span>{t("pos.received").split(" (")[0]}</span><span>{formatMMK(s.cash_received, lang)}</span></p>}
        {s.change_due != null && <p className="flex justify-between"><span>{t("pos.change")}</span><span>{formatMMK(s.change_due, lang)}</span></p>}
        <p className="mt-3 text-center">ပဲခူးဈေး · Bago Market</p>
      </div>
    </div>
  );
}
