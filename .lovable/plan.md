# Shop-owner Phase: Daily Overview, Order/Stock Entry Points

## 1. Current features confirmed (from code and database)
- **My Shop overview** (`TodaySummary` in the merchant screen): 4 tiles — today's orders, pending orders, unread messages, low stock (active products with stock 5 or less). Refreshes every 30 s. No money figures.
- **Tabs** (via `?tab=`): Sell (POS), Orders, Chat, Products, Reports, Shop (shop form plus receipt settings).
- **Products tab**: shop categories, import history, add one / from template / CSV import, search by name/SKU/barcode, edit dialog with stock history.
- **Stock ledger**: every stock change is logged by the database trigger. Allowed reasons today: opening_balance, new_product, manual_edit, online_order, order_cancelled, pos_sale, pos_void.
- **Reports**: `pos_report_range` and `orders_report_range` (Yangon days; only signed-in users can run them, not the public). `pos_day` (today's POS on Yangon date) also exists.
- **Roadmap**: stock receiving, corrections with reasons, low-stock list, cost snapshots and profit are listed as future "Phase 3" and are not approved.

## 2. Exact gaps found
1. **"Today's orders" uses the phone's own midnight, not Yangon.** It counts every status, including cancelled. It shows no money and no POS figure.
2. **No daily sales figure on the landing page.** The owner has to open Reports.
3. **Low-stock tile opens the full product list unfiltered.** The owner can't see which items are low.
4. **The Orders list has no status filter.** It shows the latest 100 orders mixed together, so pending orders are easy to miss.
5. **Stock is changed by typing a new total in the product form.** It is logged as "manual_edit" with no reason, and the owner can't say "received 20" or "counted, 3 damaged".
6. **Finding outside this phase, for your decision:** saving the Shop form always sets the delivery fee to 0 (the fee field is loaded but never shown). That means every save overwrites any fee set earlier. This is existing behavior, so I will not change it without your choice.

## 3. What the money words can mean with stored data
- **Sales (POS)**: completed POS sales total from `pos_sales` (voids shown separately). Payment method is recorded by staff, not verified.
- **Completed order value (online)**: merchandise subtotal plus delivery fee for orders marked completed. It is not proof that payment was collected.
- **Revenue**: only "POS completed total" and "online merchandise subtotal", shown side by side, never added into one hidden number.
- **Gross profit**: not available. No product cost is stored.
- **Net profit**: not available. No expenses are stored.
The UI will not show any "profit" label in this phase.

## 4. Proposed phase (small, prioritized)
**P1 — Today panel on the landing page (no SQL)**
- Two separate cards: "In-store today" (from `pos_day`: completed total, count, voided count) and "Online today" (from `orders_report_range(today, today)`: completed count, merchandise subtotal, delivery fees shown separately).
- Online orders and POS sales are never added together, so nothing is counted twice. They are separate tables.
- Fix "today's orders" to use the Yangon day: placed today, cancelled left out.
- Each card links to the matching Reports sub-tab.

**P2 — Entry-point fixes (no SQL)**
- Low-stock tile opens Products with a "Low stock" filter (stock 5 or less, active), sorted lowest first.
- Orders tab gets status filter chips (Pending, In progress, Ready/Out, Completed, Cancelled), with Pending as the default when pending orders exist.

**Later (Phase 3, needs SQL plus your review):** stock receiving, corrections with reason, low-stock follow-up/reminders, cost snapshots and profit. Reasons:
- They need new ledger reasons (the check constraint must be extended).
- They need a security-definer `adjust_stock` function, so stock is never typed in directly.
- They need a nullable cost per receipt, and profit only where every sold item has a cost.
I can stage a draft in `supabase/pending/` for your review if you want, but nothing will be applied.

## 5. Affected screens / data / functions
- Screens: merchant landing (TodaySummary), Orders tab, Products tab, dictionary (Myanmar/English labels).
- Reads only: `pos_day`, `orders_report_range`, `orders`, `products`. No new SQL, no policy changes, and no money is calculated in the browser: the totals come from the database functions as they are.
- Small pure helper for the Yangon "today" date in `src/lib/domain/reports.ts`, plus tests.

## 6. Acceptance checks (390 px phone and 1280 px desktop, Myanmar and English)
- Landing shows separate In-store and Online cards. Their figures match Reports for the same Yangon day.
- No "profit" or "revenue" total that combines both channels appears anywhere.
- An order placed at 23:50 or 00:10 Yangon time falls on the correct day. A test covers the date helper.
- Low-stock tile leads to a list containing only active items with stock 5 or less.
- Order filter chips wrap or scroll inside their row. Nothing overflows at 320–430 px.
- POS, checkout, stock ledger and reports behave exactly as before. Existing tests pass.
- Signed-in owner check: I can't sign in to this project from here, so you will need to check the owner screens in the preview.

## Decisions for you
1. Delivery fee reset (gap 6): restore a fee field, or keep "fee always 0" on purpose?
2. Do you want a pending (unapplied) SQL draft for stock receiving and corrections prepared alongside P1/P2, or kept for Phase 3?
