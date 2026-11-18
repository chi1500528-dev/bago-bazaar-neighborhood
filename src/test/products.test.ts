import { describe, expect, it } from "vitest";
import { validateProduct, draftDescription, parseCsv, analyzeRows, autoMap, rowValues, type ExistingProduct } from "@/lib/domain/products";

const base = { name: "Soap", price: "1000", sale_price: "", stock: "5", is_active: true };

describe("product form rules", () => {
  it("flags sale price not lower than price instead of dropping it", () => {
    expect(validateProduct({ ...base, sale_price: "1000" })).toContain("sale_invalid");
    expect(validateProduct({ ...base, sale_price: "900" })).toEqual([]);
  });
  it("blocks showing a zero-price product but allows it hidden", () => {
    expect(validateProduct({ ...base, price: "0" })).toContain("zero_price_visible");
    expect(validateProduct({ ...base, price: "0", is_active: false })).toEqual([]);
  });
});

describe("draft description", () => {
  it("uses only the owner's words", () => {
    const d = draftDescription({ brand: "Pigeon", size: "M" });
    expect(d).toContain("Pigeon"); expect(d).toContain("Size: M"); expect(d).not.toContain("Colour");
    expect(draftDescription({})).toBe("");
  });
});

describe("csv import", () => {
  const existing: ExistingProduct[] = [
    { id: "a", name: "Wipes", price: 3000, sale_price: null, stock: 10, sku: "W1", barcode: "111", description: null },
    { id: "b", name: "Case", price: 8000, sale_price: null, stock: 2, sku: "C1", barcode: "222", description: null },
  ];
  const parse = (csv: string) => { const [h, ...r] = parseCsv(csv); const m = autoMap(h!); return analyzeRows(r.map((c) => rowValues(c, m)), existing); };
  it("parses quoted cells", () => { expect(parseCsv('a,"b,c"\n1,"x ""y"""')).toEqual([["a", "b,c"], ["1", 'x "y"']]); });
  it("matches by barcode or SKU and lists changes", () => {
    const r = parse("name,price,stock,sku,barcode\nWipes,3500,10,,111\nCase,8000,5,C1,");
    expect(r[0]!.matchId).toBe("a"); expect(r[0]!.changes).toEqual([{ field: "price", from: "3000", to: "3500" }]);
    expect(r[1]!.matchId).toBe("b"); expect(r[1]!.changes.map((c) => c.field)).toEqual(["stock"]);
  });
  it("flags conflicts, duplicates in file and invalid sale price", () => {
    const r = parse("name,price,sale_price,sku,barcode\nX,100,,C1,111\nY,100,,,9\nZ,100,,,9\nQ,100,200,,");
    expect(r[0]!.errors).toContain("code_conflict");
    expect(r[1]!.errors).toContain("dup_in_file"); expect(r[2]!.errors).toContain("dup_in_file");
    expect(r[3]!.errors).toContain("sale_invalid");
  });
  it("warns about same-name products without codes", () => { expect(parse("name,price\nwipes,100")[0]!.possibleDuplicate).toBe(true); });
});

describe("CSV re-import safety", () => {
  const ex: ExistingProduct[] = [{ id: "p1", name: "Wipes", price: 3500, sale_price: 3000, stock: 5, sku: "BW-80", barcode: "885", description: "Soft", shop_category_id: "c1" }];
  const row = (o: Partial<Record<string, string>>) => ({ name: "Wipes", price: "3500", sale_price: "3000", stock: "5", sku: "BW-80", barcode: "885", category: "Baby", description: "Soft", ...o });
  const names = { c1: "Baby" };
  it("offers SKU, barcode and category changes", () => {
    const [r] = analyzeRows([row({ sku: "BW-81", category: "Care" })], ex, { categoryNames: names });
    expect(r!.changes.map((c) => c.field).sort()).toEqual(["category", "sku"]);
    const [r2] = analyzeRows([row({ barcode: "886" })], ex, { categoryNames: names });
    expect(r2!.changes.map((c) => c.field)).toEqual(["barcode"]);
  });
  it("matches SKU like the database (trim + case)", () => {
    const [r] = analyzeRows([row({ sku: " bw-80 ", barcode: "" })], ex, { categoryNames: names });
    expect(r!.matchId).toBe("p1");
    expect(r!.changes).toEqual([]);
  });
  it("empty cells clear only when opted in and the column is mapped", () => {
    const empty = row({ sale_price: "", description: "", category: "" });
    expect(analyzeRows([empty], ex, { categoryNames: names })[0]!.changes).toEqual([]);
    const on = analyzeRows([empty], ex, { categoryNames: names, clearEmpty: true })[0]!.changes.map((c) => c.field).sort();
    expect(on).toEqual(["category", "description", "sale_price"]);
    const unmapped = analyzeRows([empty], ex, { categoryNames: names, clearEmpty: true, mapped: ["name", "price", "sku"] })[0]!.changes;
    expect(unmapped).toEqual([]);
  });
});

import { unresolvedRows } from "@/lib/domain/products";
describe("unresolvedRows", () => {
  const mk = (line: number, o: Partial<{ errors: string[]; matchId: string | null; possibleDuplicate: boolean }>) =>
    ({ line, values: {} as never, errors: [], matchId: null, possibleDuplicate: false, changes: [], ...o }) as never;
  it("blocks error rows until skipped", () => {
    expect(unresolvedRows([mk(2, { errors: ["x"] })], {}, {})).toEqual([2]);
    expect(unresolvedRows([mk(2, { errors: ["x"] })], {}, { 2: true })).toEqual([]);
  });
  it("blocks unconfirmed same-name rows until confirmed or skipped", () => {
    expect(unresolvedRows([mk(3, { possibleDuplicate: true })], {}, {})).toEqual([3]);
    expect(unresolvedRows([mk(3, { possibleDuplicate: true })], { 3: true }, {})).toEqual([]);
    expect(unresolvedRows([mk(3, { possibleDuplicate: true })], {}, { 3: true })).toEqual([]);
  });
});
