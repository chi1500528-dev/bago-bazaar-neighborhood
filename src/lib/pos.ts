// Typed access to the in-store checkout tables/functions (not yet in the generated
// types), so calls go through these narrow untyped wrappers.
import { supabase } from "@/integrations/supabase/client";
import type { PayMethod } from "@/lib/domain/rules";

type Res<T> = Promise<{ data: T | null; error: { message: string; code?: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as <T>(
  fn: string,
  args: Record<string, unknown>,
) => Res<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (t: string) => (supabase.from as any).call(supabase, t);

export type DaySale = {
  id: string;
  sale_number: number;
  status: "completed" | "voided";
  payment_method: PayMethod;
  total: number;
  created_at: string;
};
export type Day = {
  day: string;
  revenue: number;
  count: number;
  voided: number;
  by_method: Partial<Record<PayMethod, number>>;
  sales: DaySale[];
};
export type Sale = DaySale & {
  shop_id: string;
  subtotal: number;
  cash_received: number | null;
  change_due: number | null;
  void_reason: string | null;
  voided_at: string | null;
};
export type SaleItem = {
  id: string;
  name: string;
  sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};
export type Movement = {
  id: string;
  delta: number;
  stock_after: number;
  reason: string;
  created_at: string;
};
export type CheckoutResult = {
  sale_id: string;
  sale_number: number;
  total: number;
  change_due: number | null;
  replayed: boolean;
};

/** True when the release-B database changes have not been applied yet. */
export const notInstalled = (e: { message: string; code?: string } | null) =>
  !!e &&
  (e.code === "PGRST202" ||
    e.code === "PGRST205" ||
    e.code === "42883" ||
    e.code === "42P01" ||
    /could not find|does not exist/i.test(e.message));

export const pos = {
  day: (shopId: string, day?: string) =>
    rpc<Day>("pos_day", { p_shop_id: shopId, p_day: day ?? null }),
  checkout: (a: {
    shopId: string;
    items: { product_id: string; quantity: number }[];
    payment: PayMethod;
    cash: number | null;
    expectedTotal: number;
    key: string;
  }) =>
    rpc<CheckoutResult>("pos_checkout", {
      p_shop_id: a.shopId,
      p_items: a.items,
      p_payment: a.payment,
      p_cash_received: a.cash,
      p_expected_total: a.expectedTotal,
      p_idempotency_key: a.key,
    }),
  void: (saleId: string, reason: string, returned: boolean) =>
    rpc<null>("pos_void_sale", { p_sale_id: saleId, p_reason: reason, p_items_returned: returned }),
  sale: async (id: string) => {
    const s = await from("pos_sales").select("*").eq("id", id).maybeSingle();
    const i = await from("pos_sale_items")
      .select("id,name,sku,unit_price,quantity,line_total")
      .eq("sale_id", id);
    return {
      sale: s.data as Sale | null,
      items: (i.data ?? []) as SaleItem[],
      error: s.error ?? i.error,
    };
  },
  movements: async (productId: string) => {
    const r = await from("stock_movements")
      .select("id,delta,stock_after,reason,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(30);
    return {
      data: (r.data ?? []) as Movement[],
      error: r.error as { message: string; code?: string } | null,
    };
  },
};
