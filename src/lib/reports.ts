// Read-only report calls. Functions come from the pending Milestone A SQL, so they are
// not in the generated types yet; until applied, notInstalled() is true and the UI says so.
import { supabase } from "@/integrations/supabase/client";
import type { DayRange, PosCsvSale, OrderCsvRow } from "@/lib/domain/reports";

type Err = { message: string; code?: string } | null;
type Res<T> = Promise<{ data: T | null; error: Err }>;
const rpc = supabase.rpc.bind(supabase) as unknown as <T>(fn: string, args: Record<string, unknown>) => Res<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (t: string) => (supabase.from as any).call(supabase, t);

export type TopRow = { name: string; qty: number; total: number };
export type PosReport = {
  completed_total: number; completed_count: number; by_method: Record<string, number>;
  voided_count: number; voided_value: number; top_products: TopRow[]; sales: PosCsvSale[]; sales_row_count?: number;
};
export type OrdersReport = {
  completed_count: number; merchandise_subtotal: number; delivery_fees: number; completed_value: number;
  pipeline: Record<string, { count: number; subtotal: number }>; top_products: TopRow[]; orders: OrderCsvRow[]; orders_row_count?: number;
};

const args = (shopId: string, r: DayRange) => ({ p_shop_id: shopId, p_start: r.start, p_end: r.end });
export const reports = {
  pos: (shopId: string, r: DayRange) => rpc<PosReport>("pos_report_range", args(shopId, r)),
  orders: (shopId: string, r: DayRange) => rpc<OrdersReport>("orders_report_range", args(shopId, r)),
  receiptSettings: async (shopId: string) => {
    const r = await from("shops").select("receipt_settings").eq("id", shopId).maybeSingle();
    return { data: (r.data?.receipt_settings ?? null) as unknown, error: r.error as Err };
  },
  saveReceiptSettings: async (shopId: string, s: unknown) => {
    const r = await from("shops").update({ receipt_settings: s }).eq("id", shopId);
    return { error: r.error as Err };
  },
};
