import { MediaImg } from "@/components/site/bits";
import { formatMMK } from "@/lib/domain/rules";
import type { ReceiptSettings } from "@/lib/domain/reports";
import { translate, type TKey } from "@/lib/i18n/dict";

export type PaperShop = { name: string; phone: string | null; address: string | null; logo_url: string | null };
export type PaperSale = {
  sale_number: number; created_at: string; status: string; payment_method: string; total: number;
  cash_received: number | null; change_due: number | null;
};
export type PaperItem = { id: string; name: string; quantity: number; unit_price: number; line_total: number };

/** Printed receipt body. Uses the shop's receipt language, not the app language. */
export function ReceiptPaper({ shop, sale, items, s, width }: { shop: PaperShop; sale: PaperSale; items: PaperItem[]; s: ReceiptSettings; width?: 58 | 80 }) {
  const t = (k: TKey) => translate(s.lang, k);
  const w = width ?? s.paper_width;
  return (
    <div className="receipt mx-auto bg-card p-3 font-mono text-xs leading-relaxed text-foreground" style={{ width: `${w}mm` }}>
      {s.show_logo && shop.logo_url && <div className="mx-auto mb-1 size-12 overflow-hidden rounded"><MediaImg path={shop.logo_url} alt="" className="size-full" /></div>}
      <p className="text-center text-sm font-bold">{shop.name}</p>
      {s.show_address && shop.address && <p className="text-center">{shop.address}</p>}
      {s.show_phone && shop.phone && <p className="text-center">{shop.phone}</p>}
      {s.header_note && <p className="mt-1 whitespace-pre-line text-center">{s.header_note}</p>}
      <p className="mt-2">{t("pos.sale_no")} #{sale.sale_number}</p>
      <p>{new Date(sale.created_at).toLocaleString(s.lang === "en" ? "en-GB" : "my-MM", { timeZone: "Asia/Yangon" })}</p>
      {sale.status === "voided" && <p className="mt-1 text-center font-bold">*** {t("pos.voided")} ***</p>}
      <div className="my-2 border-t border-dashed" />
      {items.map((i) => <div key={i.id} className="mb-1">
        <p>{i.name}</p>
        <p className="flex justify-between"><span>{i.quantity} × {formatMMK(i.unit_price, s.lang)}</span><span>{formatMMK(i.line_total, s.lang)}</span></p>
      </div>)}
      <div className="my-2 border-t border-dashed" />
      <p className="flex justify-between font-bold"><span>{t("pos.total")}</span><span>{formatMMK(sale.total, s.lang)}</span></p>
      <p className="flex justify-between"><span>{t("pos.pay")}</span><span>{t(`pay.${sale.payment_method}` as TKey)}</span></p>
      {sale.cash_received != null && <p className="flex justify-between"><span>{t("pos.received").split(" (")[0]}</span><span>{formatMMK(sale.cash_received, s.lang)}</span></p>}
      {sale.change_due != null && <p className="flex justify-between"><span>{t("pos.change")}</span><span>{formatMMK(sale.change_due, s.lang)}</span></p>}
      {s.footer_note && <p className="mt-3 whitespace-pre-line text-center">{s.footer_note}</p>}
      <p className="mt-3 text-center">ပဲခူးဈေး · Bago Market</p>
    </div>
  );
}
