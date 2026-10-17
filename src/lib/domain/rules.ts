// Pure business rules shared by web and future native apps. The database
// re-enforces every rule here; these exist for instant UI feedback.

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";
export type DeliveryMethod = "delivery" | "pickup";

export function formatMMK(n: number, lang: "my" | "en" = "my") {
  const num = new Intl.NumberFormat("en-US").format(Math.round(n));
  return lang === "my" ? `${num} ကျပ်` : `${num} MMK`;
}

export function effectivePrice(p: { price: number; sale_price: number | null }) {
  return p.sale_price != null && p.sale_price < p.price ? p.sale_price : p.price;
}

export function discountPercent(p: { price: number; sale_price: number | null }) {
  if (p.sale_price == null || p.sale_price >= p.price || p.price <= 0) return 0;
  return Math.round(((p.price - p.sale_price) / p.price) * 100);
}

export interface CartLine {
  productId: string;
  shopId: string;
  name: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  stock: number;
}

export type AddResult =
  | { ok: true; lines: CartLine[] }
  | { ok: false; reason: "other_shop" | "out_of_stock" };

export function addToCart(lines: CartLine[], item: CartLine): AddResult {
  if (lines.length > 0 && lines[0]!.shopId !== item.shopId) return { ok: false, reason: "other_shop" };
  const existing = lines.find((l) => l.productId === item.productId);
  const nextQty = (existing?.quantity ?? 0) + item.quantity;
  if (nextQty > item.stock) return { ok: false, reason: "out_of_stock" };
  if (existing)
    return {
      ok: true,
      lines: lines.map((l) => (l.productId === item.productId ? { ...l, ...item, quantity: nextQty } : l)),
    };
  return { ok: true, lines: [...lines, item] };
}

export function cartTotals(lines: CartLine[], method: DeliveryMethod | null, deliveryFee: number) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const fee = method === "delivery" && lines.length > 0 ? deliveryFee : 0;
  return { subtotal, deliveryFee: fee, total: subtotal + fee };
}

/** Next statuses a merchant may set. Mirrors public.update_order_status. */
export function merchantNextStatuses(status: OrderStatus, method: DeliveryMethod): OrderStatus[] {
  switch (status) {
    case "pending":
      return ["confirmed", "cancelled"];
    case "confirmed":
      return ["preparing", "cancelled"];
    case "preparing":
      return [method === "pickup" ? "ready" : "out_for_delivery", "cancelled"];
    case "ready":
    case "out_for_delivery":
      return ["completed"];
    default:
      return [];
  }
}

export function customerCanCancel(status: OrderStatus) {
  return status === "pending";
}

export function errorKey(message: string | undefined) {
  const code = (message ?? "").split(":")[0]!.trim();
  const known = ["SHOP_UNAVAILABLE", "METHOD_UNAVAILABLE", "OUT_OF_STOCK", "PRODUCT_UNAVAILABLE", "INVALID_TRANSITION"];
  type K = "err.SHOP_UNAVAILABLE" | "err.METHOD_UNAVAILABLE" | "err.OUT_OF_STOCK" | "err.PRODUCT_UNAVAILABLE" | "err.INVALID_TRANSITION" | "err.generic";
  return (known.includes(code) ? `err.${code}` : "err.generic") as K;
}

export function slugify(s: string) {
  const base = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "shop"}-${Math.random().toString(36).slice(2, 7)}`;
}
