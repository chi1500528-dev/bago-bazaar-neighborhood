// Pure report + receipt-settings rules. Platform-neutral (no DOM/React/Supabase).
// The database functions pos_report_range / orders_report_range are the authority for totals.
import { PAY_METHODS, type PayMethod } from "./rules";

/* ---------- Asia/Yangon date ranges (inclusive start day, exclusive midnight after end day) ---------- */
export const RANGE_PRESETS = ["today", "yesterday", "last7", "last30", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];
export type DayRange = { start: string; end: string }; // YYYY-MM-DD, both inclusive calendar days

const YANGON_OFFSET_MIN = 390; // UTC+06:30, no daylight saving

export function yangonToday(now: Date = new Date()) {
  return new Date(now.getTime() + YANGON_OFFSET_MIN * 60000).toISOString().slice(0, 10);
}
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function presetRange(p: Exclude<RangePreset, "custom">, now: Date = new Date()): DayRange {
  const today = yangonToday(now);
  if (p === "today") return { start: today, end: today };
  if (p === "yesterday") { const y = addDays(today, -1); return { start: y, end: y }; }
  return { start: addDays(today, p === "last7" ? -6 : -29), end: today };
}
/** UTC instants for a Yangon range: from = start 00:00 Yangon (inclusive), to = midnight after end (exclusive). */
export function rangeBounds(r: DayRange) {
  const ms = (day: string) => new Date(`${day}T00:00:00Z`).getTime() - YANGON_OFFSET_MIN * 60000;
  return { from: new Date(ms(r.start)), to: new Date(ms(addDays(r.end, 1))) };
}
export const MAX_RANGE_DAYS = 367;
export function validRange(r: DayRange) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.start) || !/^\d{4}-\d{2}-\d{2}$/.test(r.end)) return false;
  const days = (new Date(r.end).getTime() - new Date(r.start).getTime()) / 86400000;
  return days >= 0 && days < MAX_RANGE_DAYS;
}

/* ---------- POS payment reconciliation ---------- */
export type ByMethod = Record<PayMethod, number>;
export function fullByMethod(m: Partial<Record<string, number>> | null | undefined): ByMethod {
  return Object.fromEntries(PAY_METHODS.map((k) => [k, Number(m?.[k] ?? 0)])) as ByMethod;
}
/** True when Cash + KBZPay + Wave + Other equals the completed POS sales total. */
export function methodsReconcile(m: ByMethod, completedTotal: number) {
  return PAY_METHODS.reduce((s, k) => s + m[k], 0) === completedTotal;
}

/* ---------- CSV (no customer names, phones or addresses) ---------- */
function cell(v: unknown) {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; // block spreadsheet formula injection
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
export function toCsv(header: string[], rows: unknown[][]) {
  return "\uFEFF" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
export function yangonStamp(iso: string) {
  return new Date(new Date(iso).getTime() + YANGON_OFFSET_MIN * 60000).toISOString().slice(0, 19).replace("T", " ");
}
export type PosCsvSale = { sale_number: number; created_at: string; status: string; payment_method: string; total: number; void_reason: string | null };
export const POS_CSV_HEADER = ["sale_number", "date_time_yangon", "status", "payment_method", "total_mmk", "void_reason"];
export function posCsv(sales: PosCsvSale[]) {
  return toCsv(POS_CSV_HEADER, sales.map((s) => [s.sale_number, yangonStamp(s.created_at), s.status, s.payment_method, s.total, s.void_reason ?? ""]));
}
export type OrderCsvRow = { order_no: number; at: string; status: string; township: string | null; subtotal: number; delivery_fee: number; total: number };
export const ORDER_CSV_HEADER = ["order_no", "date_time_yangon", "status", "township", "merchandise_subtotal_mmk", "delivery_fee_mmk", "order_value_mmk"];
export function ordersCsv(rows: OrderCsvRow[]) {
  return toCsv(ORDER_CSV_HEADER, rows.map((o) => [o.order_no, yangonStamp(o.at), o.status, o.township ?? "", o.subtotal, o.delivery_fee, o.total]));
}

/* ---------- Receipt settings ---------- */
export type ReceiptSettings = {
  show_logo: boolean; lang: "my" | "en"; header_note: string; footer_note: string;
  paper_width: 58 | 80; show_phone: boolean; show_address: boolean;
};
export const RECEIPT_DEFAULTS: ReceiptSettings = {
  show_logo: true, lang: "my", header_note: "", footer_note: "", paper_width: 58, show_phone: true, show_address: false,
};
export const HEADER_MAX = 120;
export const FOOTER_MAX = 200;
/** Reads stored JSON safely; unknown or bad values fall back to defaults. */
export function normalizeReceipt(raw: unknown): ReceiptSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const b = (k: keyof ReceiptSettings) => (typeof r[k] === "boolean" ? (r[k] as boolean) : (RECEIPT_DEFAULTS[k] as boolean));
  const s = (k: "header_note" | "footer_note", max: number) => (typeof r[k] === "string" ? (r[k] as string).trim().slice(0, max) : "");
  return {
    show_logo: b("show_logo"), show_phone: b("show_phone"), show_address: b("show_address"),
    lang: r["lang"] === "en" ? "en" : "my",
    paper_width: r["paper_width"] === 80 ? 80 : 58,
    header_note: s("header_note", HEADER_MAX), footer_note: s("footer_note", FOOTER_MAX),
  };
}
