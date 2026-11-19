# Phase 3: Stock Receiving, Corrections, Cost Snapshots, Profit Report

## 1. What is already present
- **Stock ledger (`stock_movements`)**: the `products_stock_ledger` trigger writes one row in the same transaction as every `products.stock` change, labelled by `bm.stock_reason` / `bm.stock_ref`. Allowed reasons: opening_balance, new_product, manual_edit, online_order, order_cancelled, pos_sale, pos_void. Owners and admins can only read it; there is no direct insert, update or delete.
- **Stock-changing functions**: `place_order`, `update_order_status` (cancel restocks), `pos_checkout`, `pos_void_sale`.
- **Owner stock edit today**: the product form writes the new stock total straight to `products` (allowed by the "products owner update" policy), so the trigger logs it as `manual_edit` with no reason, quantity or cost.
- **Sale snapshots**: `order_items` and `pos_sale_items` store name and `unit_price` and `line_total` at sale time. They hold no cost.
- **Reports**: `pos_report_range` and `orders_report_range` (Yangon half-open days, owner/admin only). The UI shows no profit and says cost is not recorded.
- **Missing entirely**: no product cost, no receiving record, no supplier/reference, no correction reason, no expense data.

## 2. Gaps
1. No way to record "received N at X MMK each".
2. Corrections have no required reason. Typing a stock total bypasses any reason, because owners can update `products.stock` directly.
3. No cost on products or on sold lines, so cost of goods and gross profit cannot be known.
4. No expense records, so net profit cannot be calculated.

## 3. Smallest safe scope (proposed)
**3A — Receiving and corrections (database first)**
- New table `stock_receipts`: shop, product, quantity (>0), `unit_cost` (integer MMK, **nullable** = unknown), optional supplier text and reference text, created_by, created_at. Rows can only be written through the function below.
- New RPC `receive_stock(p_product_id, p_qty, p_unit_cost, p_supplier, p_reference, p_idempotency_key)`: owner/admin only. It locks the product, adds stock with `bm.stock_reason='stock_received'`, writes the receipt and returns it. Idempotent, so a retry on a dropped connection does not add stock twice.
- New RPC `adjust_stock(p_product_id, p_new_count, p_reason_code, p_note, p_idempotency_key)`: sets the counted quantity. Reason codes: count_correction, damaged, expired, lost, other (other needs a note). The ledger gets `stock_adjusted` plus the reason and note.
- Ledger: extend the `stock_movements.reason` check with `stock_received` and `stock_adjusted`. Add nullable `note` and `unit_cost` columns, and add `stock_receipt` and `stock_adjustment` as `ref_type` values.
- Block direct typing of stock: a guard trigger on `products` rejects any `stock` change that has no `bm.stock_reason` set. Exceptions: the existing functions (which already set it) and a product insert (the new_product opening stock).
  - The product form then shows stock read-only, with "Receive stock" and "Correct count" buttons.
  - Risk: any other code path that writes stock (CSV import, template picker) must be moved to these functions first. The audit in Build will list each one. CSV re-import that updates stock becomes an `adjust_stock` call with reason `import`.

**3B — Cost snapshots**
- `products.cost_price integer NULL` (current cost, never defaulted to 0). It is updated by `receive_stock` when a cost is given; the owner can also edit it.
- Add `unit_cost integer NULL` to `order_items` and `pos_sale_items`. `place_order` and `pos_checkout` copy `products.cost_price` into each line at sale time. Changing cost later never touches past lines. Past sales stay NULL (unknown) and are never backfilled with guesses.
- Cost method: last known cost at time of sale (simple, explainable). FIFO/average costing is out of scope.

**3C — Profit report (read-only)**
- Extend `pos_report_range` and `orders_report_range`, or add `profit_report_range`, returning per channel:
  - **Sales**: POS completed total; online merchandise subtotal (delivery fees shown separately, never in sales).
  - **Cost of goods (known)**: sum of `quantity * unit_cost` for lines with known cost.
  - **Sales with unknown cost**: value and line count.
  - **Gross profit**: shown only for the known-cost portion and labelled "Gross profit on items with known cost". If any line is unknown, show a warning with the share of sales not covered. Never label the full sales total as profit.
  - **Net profit**: not shown. It needs expense records, which do not exist. Expenses would be a separate later decision.
- Presets: today / last 7 days / this month (Yangon). POS and Online stay in separate tabs, with no combined total.
- Voided POS sales are excluded from cost and profit. Cancelled orders are excluded. Online orders count on their completion date (existing rule).

**Out of scope**: expenses and net profit, supplier management, purchase orders, FIFO costing, returns/refunds, low-stock reminders/notifications (the low-stock list from the last phase stays).

## 4. Database changes required (for your review; nothing staged or applied)
- Tables: new `stock_receipts`. `stock_movements` gets `note` and `unit_cost` plus an extended reason check. `products` gets `cost_price`. `order_items` and `pos_sale_items` get `unit_cost`.
- `stock_receipts` security:
  - Signed-in users can read it, and only for shops they own (admins can read all). The public cannot read it.
  - Nobody can insert, update or delete rows directly; only `receive_stock` writes them.
  - Uses `is_shop_owner` / `has_role`.
- Cost privacy:
  - `products.cost_price` must not reach customers, because the "products public read" policy currently exposes whole rows. Option (recommended): put cost in a separate owner-only table, `product_costs(product_id, cost_price)`, with read access for owners and admins only. That keeps the public product policy unchanged.
  - `order_items.unit_cost` is visible to the customer of that order through `can_view_order`. Recommended: keep line costs in a separate owner-only `sale_line_costs` table, or save them only on `pos_sale_items`, which customers can't read, plus a separate owner-only cost table for online lines.
  - These two choices are the biggest decision in this phase.
- RPCs: new `receive_stock` and `adjust_stock`; changed `place_order` and `pos_checkout` (copy cost); new or extended report function.
  - All functions run with fixed owner privileges and a fixed lookup path, check owner/admin themselves, can be called only by signed-in users (not the public) and are idempotent where they change stock.
- Trigger: new stock guard on `products`, and the ledger trigger updated for the new reasons.
- Risks:
  - Changing `place_order` / `pos_checkout` touches live checkout. The change only adds one copied column, with tests before and after.
  - The stock guard can break any forgotten stock-writing path, so every writer is audited first.
  - Preview and VPS share one database, so the VPS app must be updated soon after SQL is applied; old VPS code that types stock directly would be rejected by the guard.
  - Rollout order: 3A/3B SQL is applied only after code is ready, and the guard trigger is applied last.

## 5. Acceptance checks (390 px phone and 1280 px desktop, Myanmar and English, MMK)
- Receive 10 at 1,500 MMK: stock +10, one ledger row "Stock received" with the cost, one receipt row. Retrying with the same key does not add stock again.
- Correct count from 12 to 9 as "damaged": stock 9, ledger delta -3 with the reason. "Other" without a note is rejected.
- Typing a stock number directly (old code path) is rejected by the database. POS, online order, cancel and void still change stock and log as before.
- Change the product cost from 1,500 to 2,000: earlier sales still report 1,500; new sales use 2,000.
- Sales from before Phase 3 show "cost unknown"; gross profit is labelled for known-cost items only, with an unknown-share warning. Net profit does not appear.
- POS and Online totals match the existing reports for the same Yangon range; voids and cancellations are excluded from cost.
- A customer account and a signed-out visitor cannot read any cost value (checked via direct API calls).
- Forms fit at 320–430 px, number fields use the numeric keypad, and all labels exist in Myanmar and English.

## Decisions for you
1. Cost privacy: separate owner-only cost tables (recommended) vs. columns on existing tables.
2. Block direct stock typing (recommended) vs. keep it but require a reason in the form only (weaker).
3. Cost method: last known cost at sale (recommended) vs. average cost.
4. Do expenses and net profit stay out of this phase (recommended)?
