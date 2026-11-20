import { describe, expect, it } from "vitest";
import {
  presetRange,
  rangeBounds,
  fullByMethod,
  methodsReconcile,
  posCsv,
  ordersCsv,
  normalizeReceipt,
  validRange,
  exportLimited,
  sortTop,
} from "@/lib/domain/reports";

describe("Yangon report ranges", () => {
  const at = new Date("2026-11-19T18:00:00Z"); // 00:30 on 20 Nov in Yangon
  it("uses the Yangon calendar day for today", () => {
    expect(presetRange("today", at)).toEqual({ start: "2026-11-20", end: "2026-11-20" });
    expect(presetRange("last7", at)).toEqual({ start: "2026-11-14", end: "2026-11-20" });
  });
  it("ends at the exclusive midnight after the end day", () => {
    const b = rangeBounds({ start: "2026-11-19", end: "2026-11-19" });
    expect(b.from.toISOString()).toBe("2026-11-18T17:30:00.000Z");
    expect(b.to.toISOString()).toBe("2026-11-19T17:30:00.000Z");
  });
  it("rejects reversed ranges", () =>
    expect(validRange({ start: "2026-11-20", end: "2026-11-19" })).toBe(false));
});

describe("POS payment methods", () => {
  it("always lists Cash, KBZPay, Wave and Other, and they add up to the total", () => {
    const m = fullByMethod({ cash: 7000, wave: 3000 });
    expect(m).toEqual({ cash: 7000, kbzpay: 0, wave: 3000, other: 0 });
    expect(methodsReconcile(m, 10000)).toBe(true);
    expect(methodsReconcile(m, 12000)).toBe(false);
  });
});

describe("report CSV exports", () => {
  it("never include customer name, phone or address columns", () => {
    const csv = ordersCsv([
      {
        order_no: 5,
        at: "2026-11-19T03:00:00Z",
        status: "completed",
        township: "Bago",
        subtotal: 9000,
        delivery_fee: 1000,
        total: 10000,
      },
    ]);
    expect(csv).not.toMatch(/recipient|phone|address/i);
    expect(csv).toContain("9000,1000,10000");
  });
  it("shows POS times in Yangon time", () => {
    expect(
      posCsv([
        {
          sale_number: 1,
          created_at: "2026-11-19T03:00:00Z",
          status: "completed",
          payment_method: "cash",
          total: 500,
          void_reason: null,
        },
      ]),
    ).toContain("2026-11-19 09:30:00");
  });
});

describe("receipt settings", () => {
  it("defaults to logo on, Myanmar, 58mm", () => {
    expect(normalizeReceipt(null)).toMatchObject({ show_logo: true, lang: "my", paper_width: 58 });
  });
  it("keeps English and 80mm when chosen", () => {
    expect(normalizeReceipt({ lang: "en", paper_width: 80, show_logo: false })).toMatchObject({
      lang: "en",
      paper_width: 80,
      show_logo: false,
    });
  });
});

describe("report export and ranking", () => {
  it("flags an export that holds fewer rows than the range", () => {
    expect(exportLimited(5000, 5001)).toBe(true);
    expect(exportLimited(5000, 5000)).toBe(false);
  });
  it("ranks top products by quantity as a number, not text", () => {
    expect(
      sortTop([
        { name: "a", qty: 9, total: 1 },
        { name: "b", qty: 10, total: 1 },
      ]).map((r) => r.name),
    ).toEqual(["b", "a"]);
  });
});

import { lowStockList, ORDER_FILTERS } from "@/lib/domain/rules";
import { presetRange as pr2, rangeBounds as rb2 } from "@/lib/domain/reports";
describe("owner today panel", () => {
  it("Yangon today: 23:50 and 00:10 Yangon fall on different days", () => {
    expect(pr2("today", new Date("2026-11-19T17:20:00Z")).start).toBe("2026-11-19"); // 23:50 Yangon
    expect(pr2("today", new Date("2026-11-19T17:40:00Z")).start).toBe("2026-11-20"); // 00:10 Yangon
    expect(rb2(pr2("today", new Date("2026-11-19T17:40:00Z"))).from.toISOString()).toBe(
      "2026-11-19T17:30:00.000Z",
    );
  });
  it("low stock list keeps active items with 5 or fewer, lowest first", () => {
    const r = lowStockList([
      { stock: 5, is_active: true },
      { stock: 6, is_active: true },
      { stock: 0, is_active: false },
      { stock: 1, is_active: true },
    ]);
    expect(r.map((x) => x.stock)).toEqual([1, 5]);
  });
  it("ready filter covers both pickup-ready and out-for-delivery", () => {
    expect([...ORDER_FILTERS.ready]).toEqual(["ready", "out_for_delivery"]);
  });
});
