// Owner stock actions. All writes go through database functions that check shop ownership,
// write the stock ledger and are idempotent; the browser never sets stock or cost directly.
import { supabase } from "@/integrations/supabase/client";
import type { AdjustReason, CostFigures } from "@/lib/domain/stock";
import type { DayRange } from "@/lib/domain/reports";

type Err = { message: string; code?: string } | null;
type Res<T> = Promise<{ data: T | null; error: Err }>;
const rpc = supabase.rpc.bind(supabase) as unknown as <T>(fn: string, args: Record<string, unknown>) => Res<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (t: string) => (supabase.from as any).call(supabase, t);

export const newStockKey = () => crypto.randomUUID();
export type ProfitReport = { start: string; end: string; pos: CostFigures; online: CostFigures };

export const stock = {
  receive: (productId: string, qty: number, unitCost: number | null, supplier: string, reference: string, key: string) =>
    rpc<string>("receive_stock", { p_product_id: productId, p_qty: qty, p_unit_cost: unitCost, p_supplier: supplier, p_reference: reference, p_idempotency_key: key }),
  adjust: (productId: string, newCount: number, reason: AdjustReason | "import", note: string, key: string) =>
    rpc<string>("adjust_stock", { p_product_id: productId, p_new_count: newCount, p_reason: reason, p_note: note, p_idempotency_key: key }),
  setCost: (productId: string, cost: number | null) => rpc<null>("set_product_cost", { p_product_id: productId, p_cost: cost }),
  cost: async (productId: string) => {
    const r = await from("product_costs").select("cost_price").eq("product_id", productId).maybeSingle();
    return { data: (r.data?.cost_price ?? null) as number | null, error: r.error as Err };
  },
  profit: (shopId: string, r: DayRange) => rpc<ProfitReport>("profit_report_range", { p_shop_id: shopId, p_start: r.start, p_end: r.end }),
};
