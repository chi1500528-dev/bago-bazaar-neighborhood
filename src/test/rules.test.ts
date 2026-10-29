import { describe, expect, it } from "vitest";
import { addToCart, cartTotals, merchantNextStatuses, customerCanCancel, type CartLine } from "@/lib/domain/rules";

const line = (o: Partial<CartLine> = {}): CartLine => ({
  productId: "p1", shopId: "s1", name: "x", image: null, unitPrice: 1000, quantity: 1, stock: 5, ...o,
});

describe("one-shop cart", () => {
  it("rejects items from a different shop", () => {
    const r = addToCart([line()], line({ productId: "p2", shopId: "s2" }));
    expect(r).toEqual({ ok: false, reason: "other_shop" });
  });
  it("merges same product quantities and caps at stock", () => {
    const r = addToCart([line({ quantity: 4 })], line({ quantity: 1 }));
    expect(r.ok && r.lines[0]!.quantity).toBe(5);
    expect(addToCart([line({ quantity: 5 })], line()).ok).toBe(false);
  });
});

describe("totals", () => {
  it("adds delivery fee only for delivery", () => {
    const lines = [line({ quantity: 2 }), line({ productId: "p2", unitPrice: 500 })];
    expect(cartTotals(lines)).toEqual({ subtotal: 2500, total: 2500 });
  });
});

describe("order status steps", () => {
  it("follows the allowed merchant flow", () => {
    expect(merchantNextStatuses("pending", "delivery")).toEqual(["confirmed", "cancelled"]);
    expect(merchantNextStatuses("preparing", "pickup")).toContain("ready");
    expect(merchantNextStatuses("preparing", "delivery")).toContain("out_for_delivery");
    expect(merchantNextStatuses("completed", "delivery")).toEqual([]);
  });
  it("customers may cancel only pending orders", () => {
    expect(customerCanCancel("pending")).toBe(true);
    expect(customerCanCancel("confirmed")).toBe(false);
  });
});
