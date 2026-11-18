// Pure product onboarding rules (single form, CSV import, description draft).
// The database re-checks price/sale price/zero-price-visible; these give instant feedback.

export type ProductErr = "name_required" | "price_required" | "price_invalid" | "sale_invalid" | "stock_invalid" | "zero_price_visible";

export interface ProductInput { name: string; price: string; sale_price: string; stock: string; is_active: boolean }

const isWhole = (s: string) => /^\d+$/.test(s.trim());

export function validateProduct(p: ProductInput): ProductErr[] {
  const e: ProductErr[] = [];
  if (!p.name.trim()) e.push("name_required");
  const price = p.price.trim();
  if (!price) e.push("price_required");
  else if (!isWhole(price)) e.push("price_invalid");
  const sale = p.sale_price.trim();
  if (sale && (!isWhole(sale) || (isWhole(price) && Number(sale) >= Number(price)))) e.push("sale_invalid");
  if (p.stock.trim() && !isWhole(p.stock)) e.push("stock_invalid");
  if (p.is_active && isWhole(price) && Number(price) <= 0) e.push("zero_price_visible");
  return e;
}

export interface DescDetails { brand?: string; size?: string; color?: string; model?: string; material?: string; condition?: string }
const LABELS: Record<keyof DescDetails, [string, string]> = {
  brand: ["အမှတ်တံဆိပ်", "Brand"], model: ["မော်ဒယ်", "Model"], size: ["အရွယ်အစား", "Size"],
  color: ["အရောင်", "Colour"], material: ["ပစ္စည်းအမျိုးအစား", "Material"], condition: ["အခြေအနေ", "Condition"],
};
/** Joins only the owner's own words. Never adds claims. Empty when nothing given. */
export function draftDescription(d: DescDetails): string {
  const keys = (Object.keys(LABELS) as (keyof DescDetails)[]).filter((k) => d[k]?.trim());
  if (!keys.length) return "";
  const my = keys.map((k) => `${LABELS[k][0]} - ${d[k]!.trim()}`).join("။ ") + "။";
  const en = keys.map((k) => `${LABELS[k][1]}: ${d[k]!.trim()}`).join(". ") + ".";
  return `${my}\n${en}`;
}

/** Minimal RFC4180 CSV parser (quotes, commas, newlines in quotes, BOM). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  const s = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export const CSV_FIELDS = ["name", "price", "sale_price", "stock", "sku", "barcode", "category", "description"] as const;
export type CsvField = (typeof CSV_FIELDS)[number];
export const CSV_MAX_ROWS = 500;
export const CSV_EXAMPLE = "name,price,sale_price,stock,sku,barcode,category,description\nBaby wet wipes 80 pcs,3500,,24,BW-80,8851234567890,Baby care,\nPhone case (iPhone 13),8000,6500,10,PC-13,,Accessories,Clear silicone\n";

const ALIASES: Record<CsvField, string[]> = {
  name: ["name", "product", "product name", "item", "title", "အမည်", "ပစ္စည်းအမည်"],
  price: ["price", "selling price", "unit price", "ဈေးနှုန်း"],
  sale_price: ["sale price", "sale_price", "discount price", "လျှော့ဈေး"],
  stock: ["stock", "qty", "quantity", "on hand", "လက်ကျန်"],
  sku: ["sku", "code", "item code"],
  barcode: ["barcode", "ean", "upc", "ဘားကုဒ်"],
  category: ["category", "group", "အမျိုးအစား"],
  description: ["description", "details", "ဖော်ပြချက်"],
};
export function autoMap(headers: string[]): Partial<Record<CsvField, number>> {
  const m: Partial<Record<CsvField, number>> = {};
  headers.forEach((h, i) => {
    const n = h.trim().toLowerCase().replace(/_/g, " ");
    for (const f of CSV_FIELDS) if (m[f] === undefined && ALIASES[f].some((a) => a.replace(/_/g, " ") === n)) m[f] = i;
  });
  return m;
}

export interface ExistingProduct { id: string; name: string; price: number; sale_price: number | null; stock: number; sku: string | null; barcode: string | null; description: string | null; shop_category_id?: string | null }
export type RowErr = ProductErr | "dup_in_file" | "code_conflict";
export interface RowValues { name: string; price: string; sale_price: string; stock: string; sku: string; barcode: string; category: string; description: string }
export type ChangeField = "name" | "price" | "sale_price" | "stock" | "description" | "sku" | "barcode" | "category";
export interface ImportRow {
  line: number; values: RowValues; errors: RowErr[];
  matchId: string | null; possibleDuplicate: boolean;
  changes: { field: ChangeField; from: string; to: string }[];
}
export interface AnalyzeOpts { firstLine?: number; clearEmpty?: boolean; mapped?: CsvField[]; categoryNames?: Record<string, string> }

export function rowValues(cells: string[], map: Partial<Record<CsvField, number>>): RowValues {
  const g = (f: CsvField) => (map[f] !== undefined ? (cells[map[f]!] ?? "").trim() : "");
  return { name: g("name"), price: g("price").replace(/,/g, ""), sale_price: g("sale_price").replace(/,/g, ""), stock: g("stock").replace(/,/g, ""), sku: g("sku"), barcode: g("barcode"), category: g("category"), description: g("description") };
}

/** Same normalisation as the database unique indexes: SKU trimmed + case-insensitive, barcode trimmed. */
export const skuKey = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
export const barcodeKey = (s: string | null | undefined) => (s ?? "").trim();

/** Fields an empty cell may clear (only when that column is mapped and the owner opts in). Name/price/stock/codes never clear. */
export const CLEARABLE: ChangeField[] = ["sale_price", "description", "category"];

/** Validates rows and matches to existing products by barcode or SKU. Imports are hidden, so zero price is a warning not an error. */
export function analyzeRows(rows: RowValues[], existing: ExistingProduct[], opts: AnalyzeOpts | number = {}): ImportRow[] {
  const o: AnalyzeOpts = typeof opts === "number" ? { firstLine: opts } : opts;
  const firstLine = o.firstLine ?? 2;
  const mapped = new Set(o.mapped ?? CSV_FIELDS);
  const catName = (id: string | null | undefined) => (id ? o.categoryNames?.[id] ?? "" : "");
  const count = (k: (r: RowValues) => string) => { const m = new Map<string, number>(); rows.forEach((r) => { const v = k(r); if (v) m.set(v, (m.get(v) ?? 0) + 1); }); return m; };
  const bc = count((r) => barcodeKey(r.barcode)); const sk = count((r) => skuKey(r.sku));
  const byBarcode = new Map(existing.filter((p) => barcodeKey(p.barcode)).map((p) => [barcodeKey(p.barcode), p]));
  const bySku = new Map(existing.filter((p) => skuKey(p.sku)).map((p) => [skuKey(p.sku), p]));
  const names = new Set(existing.map((p) => p.name.trim().toLowerCase()));
  return rows.map((v, i) => {
    const errors: RowErr[] = validateProduct({ ...v, is_active: false });
    const vb = barcodeKey(v.barcode), vs = skuKey(v.sku);
    if ((vb && bc.get(vb)! > 1) || (vs && sk.get(vs)! > 1)) errors.push("dup_in_file");
    const a = vb ? byBarcode.get(vb) : undefined;
    const b = vs ? bySku.get(vs) : undefined;
    if (a && b && a.id !== b.id) errors.push("code_conflict");
    const match = a ?? b ?? null;
    const changes: ImportRow["changes"] = [];
    if (match && !errors.length) {
      const cmp = (field: ChangeField, from: string, to: string, same = from === to) => {
        if (same) return;
        if (to !== "") changes.push({ field, from, to });
        else if (o.clearEmpty && from !== "" && CLEARABLE.includes(field) && mapped.has(field as CsvField)) changes.push({ field, from, to: "" });
      };
      cmp("name", match.name, v.name); cmp("price", String(match.price), v.price);
      cmp("sale_price", match.sale_price == null ? "" : String(match.sale_price), v.sale_price);
      cmp("stock", String(match.stock), v.stock); cmp("description", match.description ?? "", v.description);
      cmp("sku", match.sku ?? "", v.sku, skuKey(match.sku) === vs);
      cmp("barcode", match.barcode ?? "", v.barcode, barcodeKey(match.barcode) === vb);
      const cur = catName(match.shop_category_id);
      cmp("category", cur, v.category, cur.trim().toLowerCase() === v.category.trim().toLowerCase());
    }
    return { line: firstLine + i, values: v, errors, matchId: match?.id ?? null, possibleDuplicate: !match && !vb && !vs && names.has(v.name.trim().toLowerCase()), changes };
  });
}

/** Rows the owner must decide on before saving: errors or unconfirmed same-name rows, unless explicitly skipped. Never skip silently. */
export function unresolvedRows(rows: ImportRow[], dupOk: Record<number, boolean>, skip: Record<number, boolean>): number[] {
  return rows.filter((r) => !skip[r.line] && (r.errors.length > 0 || (!r.matchId && r.possibleDuplicate && !dupOk[r.line]))).map((r) => r.line);
}
