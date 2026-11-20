# Phase 2 plan (revised): small in-store checkout for Bago shop owners

Two separate releases, in this order. Release A must be tested and published before Release B starts.

## Release A — Phase 1 CSV import fix (prerequisite, no new checkout, no stock ledger)

- Invalid or unconfirmed rows are never skipped silently. The preview lists each problem row with the reason; the owner fixes it or explicitly ticks "skip this row".
- The dialog stays open and shows "X added, Y updated, Z failed / skipped" when anything did not succeed; it only shows success when every chosen row succeeded.
- Import history records the real counts.
- App-side change only (plus tests). No checkout tables, no database functions changed.
- Review in Preview: import a CSV with one bad price and one unconfirmed match; confirm both are shown, nothing is silently dropped, and the summary is correct.

## Release B — In-store checkout (POS) + stock history

### What the owner gets

- "Sell in store" tab in My Shop: search by name, SKU or barcode, add items, choose payment (Cash, KBZPay, Wave, Other), finish sale.
- Sales list with today's revenue (Myanmar day), each sale's receipt, and a Void action.
- Stock history per product: every increase or decrease with reason (opening balance, manual edit, CSV import, online order, order cancelled, in-store sale, sale voided).

### 1. Server decides prices and totals

- The checkout function receives only product IDs, quantities, payment method, optional cash received, and an idempotency key.
- In one database transaction it locks the products (same lock order as online orders), checks they belong to the owner's shop, are not archived, and have enough stock; then it reads the current price (sale price if set, else price), calculates line totals and the sale total itself. Any price or total sent by the browser is ignored.
- If a price changed after the item was added to the cart: the sale uses the current database price. The function returns the final prices; the screen shows the updated total and highlights changed lines before the receipt is shown. To avoid surprises, the app refreshes prices when "Finish sale" is pressed and asks the owner to confirm if any price differs from what was on screen; the sale is only created after that confirmation.
- Not enough stock: the whole sale is rejected, nothing is saved, and the screen says which item is short.

### 2. Stock history covers every stock change

Every path that changes `products.stock` writes a `stock_movements` row in the same transaction:

- Manual stock edit in the product form: moved from a direct browser update to a database function (or a trigger on stock change) that writes the movement with reason "manual edit".
- CSV import: starting/updated stock writes "CSV import" movements.
- Online order placement (`place_order`): one "online order" movement per item.
- Online order cancellation (`update_order_status`): current code restores stock by joining order items to products when status becomes "cancelled". Cancelled is a final status (no transition out of it), so it can only happen once. The movement will be written from the same statement, only for items whose product still exists and whose stock was actually restored — so exactly one "order cancelled" movement per restored item, none for removed products.
- In-store sale: "in-store sale" movement per item. Void: "sale voided" movement per item, only when stock is restored.
- Opening balance: at release, one "opening balance" movement per existing product equal to its current stock. History before that date is not available; the app will say "History starts on <date>". Past orders are not reconstructed.

### 3. Sale records and numbers

- Database rules: `UNIQUE(shop_id, sale_number)` and `UNIQUE(shop_id, idempotency_key)`.
- Sale numbers are per shop, issued from a per-shop counter inside the transaction; never reused, including after a void.
- Completed and voided sales are never deleted (no delete permission; voiding only changes status).
- Retry safety: the network can drop after the database has saved a sale, so the phone never hears "success". The app keeps the same idempotency key for that cart and retries; the database returns the already-saved sale instead of creating a second one or taking stock twice.

### 4. Void

- Owner presses Void, picks a reason, and must tick "The items are back on the shelf". Only then is stock restored and the sale marked voided (once; a voided sale cannot be voided again).
- The app does not reverse cash, KBZPay or Wave payments. The screen states that any refund must be handled by the shop owner separately.

### 5. Cash rules

- Cash: "cash received" is optional. If entered, the server rejects it if below the server-calculated total, and the server calculates change.
- KBZPay, Wave, Other: cash received and change stay empty (server rejects values).

### 6. Today's revenue

- "Today" = calendar day in Asia/Yangon, computed in the database.
- Revenue and per-payment totals exclude voided sales. Voided sales still appear in the sales list, marked "Voided".

### 7. Archived or deleted products

- Products with any sale or stock history cannot be hard-deleted; the owner gets "Archive" instead (hidden from customers and POS, history kept). Products with no history may still be deleted.
- Each sale line and stock movement stores a snapshot: product name, SKU, barcode, unit price at that time, so history reads correctly even if the product is renamed or archived.

### 8. Barcode scanners

- Works with USB or Bluetooth scanners that act like a keyboard, when the POS search box is focused (scan types the code + Enter; an exact barcode match adds the item).
- Not every device is guaranteed; the owner should test their scanner in Preview.
- No automatic beep, and no always-on keyboard capture outside the search box. No camera scanning in this phase.

### 9. Receipts

- Browser-printable receipt page with 58mm and 80mm layouts on a best-effort basis. Real thermal printing depends on the phone/computer, browser and printer; no printer drivers or cash drawer in this phase.

### Not included

Offline selling, payment processing/refunds, profit/cost reports, staff accounts, camera scanning, hardware drivers.

## Safe release sequence (Release B)

Environment facts: Lovable applies migrations to this project's connected Supabase project (the same one the Preview uses). The Google Cloud VPS app is configured with `SUPABASE_URL` / `VITE_SUPABASE_URL` pointing to that same Supabase project, so the live site shares this database. There is no separate staging database today, so a migration applied here affects the live site immediately.

Sequence:

1. Read-only checks first: count products, any negative stock, products with price 0, and confirm the VPS env points to the same Supabase project ID.
2. Migration is additive: new tables (`pos_sales`, `pos_sale_items`, `stock_movements`, per-shop counter), new functions, opening balances. Existing functions (`place_order`, `update_order_status`) are updated to also write movements, keeping their current inputs/outputs so the currently deployed VPS app keeps working.
3. Validate in Preview: test sales, retries, void, cancel an online order, manual stock edit, today's total; check that stock numbers match the history.
4. Only after approval: publish/pull to the VPS and rebuild.
5. Rollback plan: new screens can be hidden by reverting the app; the additive tables stay in place. Test sales made during validation remain as records (they can be voided, not deleted) — use a test product.

## Preview checklist (Release B)

- Sell 2 items with cash; change is correct; stock drops; receipt prints in browser.
- Change a price mid-cart; app asks to confirm the new total.
- Retry after a simulated failure; only one sale and one stock change.
- Void with the "back on shelf" tick; stock restored once; revenue excludes it; record still listed.
- Cancel an online order; stock history shows one "order cancelled" entry.
- Edit stock manually; history shows "manual edit".
- Try deleting a product that was sold; only Archive is offered.
- Scan with your own scanner in the search box.

## Technical notes

- `stock_movements(id, shop_id, product_id null, product_name, sku, barcode, delta, stock_after, reason, ref_type, ref_id, created_by, created_at)`; product FK `on delete set null`; owner read-only via RLS, writes only from security-definer functions.
- Manual edits: replace direct `products.stock` update with `set_product_stock(product_id, new_stock)` RPC, or a BEFORE UPDATE trigger that logs when stock changes and no movement context is set; functions set a transaction-local flag so moves are not double-logged.
- Cancellation: `with r as (update products p set stock = p.stock + oi.quantity from order_items oi where ... returning ...) insert into stock_movements select ... from r`.
- `pos_sales`: status `completed|voided`, payment_method, subtotal, total, cash_received, change_due, voided_at/by/reason, sale_number, idempotency_key; CHECK constraints for cash rules; no DELETE grant/policy.
- Business rules mirrored in `src/lib/domain/rules.ts` for display only; database is the authority.
