import { describe, expect, it } from "vitest";
import { presetRange, rangeBounds, fullByMethod, methodsReconcile, posCsv, ordersCsv, normalizeReceipt, validRange } from "@/lib/domain/reports";

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
  it("rejects reversed ranges", () => expect(validRange({ start: "2026-11-20", end: "2026-11-19" })).toBe(false));
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
    const csv = ordersCsv([{ order_no: 5, at: "2026-11-19T03:00:00Z", status: "completed", township: "Bago", subtotal: 9000, delivery_fee: 1000, total: 10000 }]);
    expect(csv).not.toMatch(/recipient|phone|address/i);
    expect(csv).toContain("9000,1000,10000");
  });
  it("shows POS times in Yangon time", () => {
    expect(posCsv([{ sale_number: 1, created_at: "2026-11-19T03:00:00Z", status: "completed", payment_method: "cash", total: 500, void_reason: null }])).toContain("2026-11-19 09:30:00");
  });
});

describe("receipt settings", () => {
  it("defaults to logo on, Myanmar, 58mm", () => {
    expect(normalizeReceipt(null)).toMatchObject({ show_logo: true, lang: "my", paper_width: 58 });
  });
  it("keeps English and 80mm when chosen", () => {
    expect(normalizeReceipt({ lang: "en", paper_width: 80, show_logo: false })).toMatchObject({ lang: "en", paper_width: 80, show_logo: false });
  });
});
