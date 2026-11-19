/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/site/shell";
import { useApp } from "@/lib/app-state";
import { normalizeReceipt } from "@/lib/domain/reports";
import { ReceiptPaper, type PaperShop } from "@/components/site/receipt-paper";
import { pos } from "@/lib/pos";
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
  const { t } = useApp();
  const [w, setW] = useState<58 | 80 | null>(null);
  const q = useQuery({
    queryKey: ["receipt", id],
    queryFn: async () => {
      const r = await pos.sale(id);
      let shop: (PaperShop & { receipt_settings?: unknown }) | null = null;
      if (r.sale) {
        const full = await (supabase.from("shops") as any).select("name,phone,address,logo_url,receipt_settings").eq("id", r.sale.shop_id).maybeSingle();
        // Before the receipt-settings column exists, fall back to the plain shop fields.
        shop = full.error ? (await supabase.from("shops").select("name,phone,address,logo_url").eq("id", r.sale.shop_id).maybeSingle()).data : full.data;
      }
      return { ...r, shop, settings: normalizeReceipt(shop?.receipt_settings) };
    },
  });
  if (q.isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  const s = q.data?.sale;
  if (!s || !q.data?.shop) return <EmptyState text={t("err.generic")} />;
  const width = w ?? q.data.settings.paper_width;
  return (
    <div className="mx-auto max-w-md py-6">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <span className="ml-auto text-sm text-muted-foreground">{t("pos.width")}</span>
        {([58, 80] as const).map((x) => <Button key={x} size="sm" variant={width === x ? "default" : "outline"} onClick={() => setW(x)}>{x}mm</Button>)}
        <Button size="sm" onClick={() => window.print()}><Printer className="size-4" />{t("pos.print")}</Button>
      </div>
      <ReceiptPaper shop={q.data.shop} sale={s} items={q.data.items} s={q.data.settings} width={width} />
    </div>
  );
}
