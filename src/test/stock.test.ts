import { describe, expect, it } from "vitest";
import { validateReceive, validateAdjust, parseUnitCost, profitView } from "@/lib/domain/stock";

describe("stock receiving", () => {
  it("accepts 10 received at 1,500 MMK", () => expect(validateReceive({ qty: "10", unitCost: "1500" })).toEqual([]));
  it("blank cost stays unknown, never 0", () => { expect(validateReceive({ qty: "10", unitCost: "" })).toEqual([]); expect(parseUnitCost("")).toBeNull(); });
  it("rejects zero quantity", () => expect(validateReceive({ qty: "0", unitCost: "" })).toContain("qty_range"));
});
describe("stock corrections", () => {
  it("12 → 9 as damaged is valid", () => expect(validateAdjust({ count: "9", reason: "damaged", note: "" }, 12)).toEqual([]));
  it("reason is required", () => expect(validateAdjust({ count: "9", reason: "", note: "" }, 12)).toContain("reason_required"));
  it("'other' needs a note", () => expect(validateAdjust({ count: "9", reason: "other", note: " " }, 12)).toContain("note_required"));
});
describe("profit labelling", () => {
  it("no cost known → no profit shown", () => expect(profitView({ sales: 10000, known_cost_sales: 0, known_cost: 0, unknown_cost_sales: 10000, unknown_lines: 2 })).toEqual({ kind: "none", reason: "no_cost" }));
  it("partial cost → gross only on known-cost sales", () => expect(profitView({ sales: 10000, known_cost_sales: 6000, known_cost: 4000, unknown_cost_sales: 4000, unknown_lines: 1 }))
    .toEqual({ kind: "partial", grossOnKnown: 2000, coveredShare: 0.6, uncoveredSales: 4000 }));
  it("all cost known → complete", () => expect(profitView({ sales: 5000, known_cost_sales: 5000, known_cost: 3000, unknown_cost_sales: 0, unknown_lines: 0 }).kind).toBe("complete"));
});
