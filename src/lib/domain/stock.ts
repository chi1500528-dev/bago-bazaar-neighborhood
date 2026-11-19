// Pure Phase 3 rules: stock receiving, count corrections, cost-based profit labelling.
// Platform-neutral (no DOM/React/Supabase). Database functions stay the authority; these
// rules mirror them for form validation and for labelling report figures honestly.

export const ADJUST_REASONS = ["count_correction", "damaged", "expired", "lost", "other"] as const;
export type AdjustReason = (typeof ADJUST_REASONS)[number];
export const NOTE_MAX = 200;
export const SUPPLIER_MAX = 80;
export const REFERENCE_MAX = 60;

const intOrNull = (s: string) => (s.trim() === "" ? null : /^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN);

export type ReceiveErr = "qty_required" | "qty_range" | "cost_invalid" | "supplier_long" | "reference_long";
/** Quantity 1–99,999; unit cost optional (blank = unknown, never 0 by default). */
export function validateReceive(f: { qty: string; unitCost: string; supplier?: string; reference?: string }): ReceiveErr[] {
  const e: ReceiveErr[] = [];
  const q = intOrNull(f.qty);
  if (q === null) e.push("qty_required");
  else if (Number.isNaN(q) || q < 1 || q > 99999) e.push("qty_range");
  const c = intOrNull(f.unitCost);
  if (c !== null && (Number.isNaN(c) || c > 100_000_000)) e.push("cost_invalid");
  if ((f.supplier ?? "").trim().length > SUPPLIER_MAX) e.push("supplier_long");
  if ((f.reference ?? "").trim().length > REFERENCE_MAX) e.push("reference_long");
  return e;
}
export function parseUnitCost(s: string): number | null {
  const c = intOrNull(s);
  return c === null || Number.isNaN(c) ? null : c;
}

export type AdjustErr = "count_required" | "count_range" | "reason_required" | "note_required" | "note_long" | "no_change";
/** Counted quantity replaces stock; a reason is always required, "other" also needs a note. */
export function validateAdjust(f: { count: string; reason: AdjustReason | ""; note: string }, currentStock: number): AdjustErr[] {
  const e: AdjustErr[] = [];
  const n = intOrNull(f.count);
  if (n === null) e.push("count_required");
  else if (Number.isNaN(n) || n < 0 || n > 999999) e.push("count_range");
  else if (n === currentStock) e.push("no_change");
  if (!f.reason || !ADJUST_REASONS.includes(f.reason)) e.push("reason_required");
  if (f.reason === "other" && !f.note.trim()) e.push("note_required");
  if (f.note.trim().length > NOTE_MAX) e.push("note_long");
  return e;
}

/* ---------- Profit labelling (figures come from the database; this only decides what may be claimed) ---------- */
export type CostFigures = { sales: number; known_cost_sales: number; known_cost: number; unknown_cost_sales: number; unknown_lines: number };
export type ProfitView =
  | { kind: "none"; reason: "no_sales" | "no_cost" }
  | { kind: "partial" | "complete"; grossOnKnown: number; coveredShare: number; uncoveredSales: number };

/** Gross profit only on lines with a known cost snapshot; never on the full sales total. Net profit is never produced (no expense data). */
export function profitView(f: CostFigures): ProfitView {
  if (f.sales <= 0) return { kind: "none", reason: "no_sales" };
  if (f.known_cost_sales <= 0) return { kind: "none", reason: "no_cost" };
  const coveredShare = Math.round((f.known_cost_sales / f.sales) * 1000) / 1000;
  return {
    kind: f.unknown_lines === 0 && f.unknown_cost_sales === 0 ? "complete" : "partial",
    grossOnKnown: f.known_cost_sales - f.known_cost,
    coveredShare,
    uncoveredSales: f.unknown_cost_sales,
  };
}
