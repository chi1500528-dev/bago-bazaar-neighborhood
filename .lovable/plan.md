# Bago Market — Easy product adding + small in-store checkout

Plan only. Nothing is built until you say: "I approve this plan. Switch to Build mode."

## 1. What the app already has

- One web app, Burmese first + English, prices in MMK (whole kyat).
- Shop owners land in "My Shop": Today summary (orders, pending, unread messages, low stock), shop switcher, tiles for Orders, Messages, Products, Shop details.
- Products: name, description, price, sale price, stock, photos (paste/drag/upload), marketplace category + the shop's own categories.
- Online orders: one-shop cart, delivery or pickup, pay on delivery/pickup. Ordering reduces stock safely inside the database (locks the product row, refuses if not enough stock, ignores a duplicate tap). Cancelling an order puts stock back. Order lines keep the name and price from the time of the order.
- Chat between customer and shop, sound + pop-up alerts while the app is open.
- Access rules: each shop's products/orders are visible to editing only by its owner (and admin). Merchants cannot approve their own shop.
- Install to home screen (app icon, name, colours) works. There is **no offline mode** — the app needs internet.
- Relay for Myanmar networks stays as is.

## 2. What is missing

- Adding many products is slow: one at a time only.
- No product templates, no CSV import, no description helper.
- No in-store sales: no POS cart, no payment method record, no receipt, no sales history.
- No stock history — today you can't see why stock changed.
- No barcode / SKU field on products.
- No cost price, so profit cannot be calculated (only revenue).

## 3. Screens and flows

### A. Add products (Products tab -> "Add products" button with 3 choices)
1. **Add one** — current form, simplified for phones (name, price, stock, photo first; "More details" folds open).
2. **From starter catalog** — search box + groups by shop type (Baby & Mum, Phone & accessories, Beauty, Grocery/daily goods, Stationery, Home & kitchen). Tick items -> "Add to my shop". Each becomes an editable copy marked **hidden (draft)** with price and stock empty; the owner must enter price + stock before it can be shown to customers. Templates hold only name, generic category, optional unit/size words and a neutral photo if we have a real licensed one (otherwise no photo).
3. **Import CSV** — steps: Download example file -> Upload -> Match columns -> Preview with row-by-row errors -> Save valid rows (all as hidden drafts, or "show immediately" option). Clear notice: this is a one-time copy, not a live link to the other POS.
   - Safe fields: name (required), price (required, whole MMK), sale price, stock, barcode/SKU, shop category name (created if new), description.
   - Not imported: photos (added after), marketplace category (chosen once for the batch), anything else.
   - Errors shown per row in Burmese/English, e.g. "Row 12: price is not a number", "Row 30: duplicate barcode". Limit ~500 rows per file. Matching barcode/SKU on re-import updates that product instead of duplicating (asks first).

### B. Draft description
- On the product form: "Draft description" button. Owner fills optional fields (brand, size, colour, model, material, condition).
- The app has **no AI service set up yet**. Lovable's built-in AI could be turned on later; it uses credits (small usage is usually free, more is paid). Recommendation for milestone: a **template fallback** that writes plain sentences only from what the owner typed (e.g. "Brand: X. Size: M. Colour: blue. Condition: new.") in Burmese and English. No invented claims.
- The draft goes into the description box; nothing publishes until the owner saves.

### C. In-store sale (new "Sell" tile in My Shop)
1. Search product by name or barcode (typed, or a USB/Bluetooth scanner that acts like a keyboard).
2. Tap to add; +/- quantity; remove. Shows stock left.
3. "Complete sale" -> choose payment: Cash, KBZPay, Wave, Other (+ note). Optional cash received -> shows change.
4. Saved sale screen with receipt -> "Print" uses the phone/computer print dialog (58/80 mm friendly layout).
5. "Sales" list: today's total, count, total by payment method; open a sale; "Void/refund" with reason -> stock goes back.
- Wording says **"Sales (revenue)"**, never profit.

## 4. Database, security and stock safety

New records:
- **in-store sales**: shop, sale number, payment method, total, status (completed / voided), who sold, a one-time "tap key", time.
- **sale items**: product link + **copied name and price at sale time** (later edits don't change history).
- **stock movements**: every stock change (online order, order cancelled, in-store sale, void, manual edit, import) with amount and reason. Gives a stock history and makes checks possible.
- **product templates** (admin-managed, read-only for owners).
- Products get: **barcode/SKU** (unique per shop, optional). Cost price waits for Phase 3.

Safety:
- Sales are created only by a secure database function (like today's `place_order`): checks the caller owns the shop, locks each product, refuses if stock is too low, reduces stock once, writes sale + items + movements together — all or nothing.
- **Duplicate taps / bad connection**: each sale carries a tap key; sending again returns the same sale instead of making a second one. Button disabled while saving.
- **Online and in-store at the same moment**: both lock the same product row, so one waits a split second; the second is refused with "only N left" if stock ran out.
- **Void/refund**: secure function, only once per sale, restores stock and logs a movement. Full void in v1 (no partial refund).
- Access: only the shop owner (and admin read) sees/edits that shop's sales and movements; customers never see them. Sales/movements cannot be edited or deleted directly.
- Existing online-order functions get updated to also write stock movements.

## 5. Phased build order

**Milestone 1 (review in Preview)** — small, no hardware:
- Barcode/SKU field + stock movements log.
- "Sell" screen: search, cart, payment method, complete sale, receipt print, today's sales list, void.
- Phone layout pass on My Shop, product form and Sell screen (big buttons, readable Burmese).

**Milestone 2** — CSV import (example file, mapping, preview, row errors).

**Milestone 3** — Starter catalog (needs your template list) + Draft description (template version).

**Later, after shop owner feedback**
- Cost price -> profit estimate (needs cost per product; real profit also needs expenses like rent, staff, transport).
- AI descriptions (if you approve credit use).
- Stock history screen, low-stock reorder list, sales by day/week charts.
- Partial refunds, staff accounts, multiple branches, offline sales.
- Direct thermal printer printing, cash drawer, camera barcode scanning — each needs testing on real devices. Keyboard-style scanners and the normal print dialog are the safest first options; no promise every device works.
- Push notifications when the app is closed.

## 6. Questions for you

1. Payment methods list: Cash, KBZPay, Wave, AYA Pay, CB Pay, Other — add or remove any?
2. Should an in-store sale be allowed when stock shows 0 (owner's count may be wrong), or always blocked?
3. Who will write the starter catalog items (you provide a list, or I draft a short list per shop type for you to check)?
4. Receipt: what should it show — shop name, phone, address, sale no., date, items, total, payment method, "Thank you" line? Any extra text?
5. Is Milestone 1 = POS first the right order, or do you want CSV import first?

## Technical notes
- New tables: `pos_sales`, `pos_sale_items`, `stock_movements`, `product_templates`; `products.sku` with partial unique index (shop_id, sku). RLS via `is_shop_owner`; no direct insert/update/delete grants on sales/movements.
- SECURITY DEFINER RPCs: `pos_create_sale(shop, items, method, note, idempotency_key)`, `pos_void_sale(id, reason)`; `place_order` / `update_order_status` amended to insert `stock_movements`. Rules mirrored in `src/lib/domain/rules.ts` with tests.
- CSV parsed in the browser (papaparse), validated with zod, inserted in batches through existing RLS.
- Receipt via `window.print()` + print CSS. All labels in `dict.ts`.
