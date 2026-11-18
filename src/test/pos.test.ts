import { describe, expect, it } from "vitest";
import { cashChange, changedPrices, effectivePrice, yangonDay } from "@/lib/domain/rules";

describe("in-store checkout rules", () => {
  it("uses sale price only when lower than price", () => {
    expect(effectivePrice({ price: 5000, sale_price: 4000 })).toBe(4000);
    expect(effectivePrice({ price: 5000, sale_price: null })).toBe(5000);
  });
  it("gives cash change and rejects too little cash", () => {
    expect(cashChange("cash", 7500, 10000)).toBe(2500);
    expect(cashChange("cash", 7500, 5000)).toBe("too_low");
    expect(cashChange("cash", 7500, null)).toBeNull();
  });
  it("never computes change for KBZPay, Wave or Other", () => {
    expect(cashChange("kbzpay", 7500, 10000)).toBeNull();
    expect(cashChange("wave", 7500, 10000)).toBeNull();
  });
  it("flags lines whose price changed", () => {
    const lines = [{ productId: "a", unitPrice: 1000 }, { productId: "b", unitPrice: 2000 }];
    expect(changedPrices(lines, { a: 1000, b: 2500 }).map((l) => l.productId)).toEqual(["b"]);
  });
  it("counts the day in Myanmar time (UTC+6:30)", () => {
    expect(yangonDay(new Date("2026-11-17T18:00:00Z"))).toBe("2026-11-18");
    expect(yangonDay(new Date("2026-11-17T17:00:00Z"))).toBe("2026-11-17");
  });
});
