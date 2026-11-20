# Bago Market — Product onboarding first, then a small in-store checkout

Plan only. Nothing is built, seeded or deployed until you say: "I approve this plan. Switch to Build mode."
Unchanged and protected: login, Resend email codes, the Supabase relay, the Google Cloud VPS setup, one mobile-friendly web app, Burmese first + English, MMK.

## 1. What the app already has

- Owners land in "My Shop": Today summary, shop switcher, Orders, Messages, Products, Shop details.
- Products: name, description, price, sale price, stock, photos, marketplace category + the shop's own categories.
- Online orders reduce stock safely in the database (locks the product, refuses if not enough, ignores duplicate taps). Cancelling puts stock back. Order lines keep the name and price from order time.
- Each shop's data is editable only by its owner (and admin).
- Install to home screen works. No offline mode.

## 2. What is missing

- Only one-at-a-time product adding. No CSV import, no templates, no description helper.
- No SKU or barcode fields.
- No in-store sales, receipts or sales history.
- No stock history. No cost price (so no profit).

## 3. What a CSV import is (and is not)

- A **one-time copy** of the owner's product list from their other POS.
- **Not** a live connection. Sales made later in the other POS will not change Bago Market stock.
- To keep online stock correct, the shop should record future in-store sales in Bago Market (Milestone 2). This is shown on the import screen in Burmese and English.

## 4. Price and stock rules (checked in the current database)

- Today: price is required (whole MMK, 0 or more); stock is required (default 0, never below 0); a sale price that isn't lower than the price is quietly removed on save.
- New rule: a product needs a **price above 0 before it can be shown to customers**. It may be saved hidden with 0, but "Show to customers" is blocked — enforced in the database, not just on screen.
- Templates and CSV rows missing required details stay **unsaved on screen** until the owner fills them. No empty or fake-price products are stored.
- Imported products always start **hidden from customers**.
- **Existing products check (done read-only today):** the shop database has 2 products, and none are priced 0 (shown or hidden). Before the new rule is added, the same read-only check runs again. If any shown product is priced 0 at that time, nothing is changed automatically — the rule only applies when a product is next saved or shown, and the owner sees a "Set a price to keep this product visible" notice in their Products list. No product is hidden, deleted or edited by the app.

## 5. Milestone 1 — Product onboarding

Builds:

- **SKU and barcode as two separate optional fields.** A product can have both; each is unique within one shop. Search finds either. Scanning matches the barcode field only.
- Products tab -> "Add products": Add one / From starter catalog / Import CSV.
- **Draft description** (on the product form): owner fills optional boxes — brand, size, colour, model, material, condition — and taps "Draft description". The app joins only those words into simple Burmese and English sentences. No AI, no credits, nothing invented. The draft goes into the description box, stays editable, and saves only when the owner taps Save.
- **CSV import**: download example file -> upload -> match columns -> preview -> save.
  - Columns: name (required), price (required), sale price, stock, SKU, barcode, shop category (created if new), description. Photos added afterwards.
  - Row errors shown clearly and fixable on screen, e.g. "Row 12: price is not a number", "Row 8: sale price must be lower than price", "Row 30: barcode used twice in this file". **Invalid sale prices are flagged, never silently dropped.** Rows with errors are not saved until fixed; valid rows can be saved.
  - Price 0 rows: allowed only as hidden, with a warning.
  - Limit: 500 rows per file.
- **Safe re-import / duplicates**:
  - A row matching an existing product by barcode **or** SKU is shown as "Update", with old vs new for every changed field. Nothing changes until the owner ticks the updates and confirms. Price and stock are never overwritten without that tick.
  - Barcode and SKU point to two different existing products -> flagged as a conflict, not saved.
  - Same barcode or SKU twice in the file -> both rows flagged.
  - Row with no barcode and no SKU -> treated as new; if a product with the same name exists, a "possible duplicate" warning lets the owner Add anyway or Skip.
- **Starter catalog sample**: small list (section 7), only after names are checked. Tick items, fill price + stock on the same screen, save. Incomplete picks are not saved.
- **Single-product form: invalid sale price is now an error, not silently removed.** If the sale price is not lower than the price (or not a number), the form shows "Sale price must be lower than price" next to the box and Save waits until the owner fixes or clears it. The database keeps refusing invalid sale prices as a safety net instead of quietly dropping them.
- **Starting stock from imports (no stock history yet):** Milestone 1 has no stock history. Each import saves a simple import record (date, who, file name, rows added/updated) so the owner can see what was imported. When stock history arrives in Milestone 2, each product's current stock is recorded once as its "starting balance", so history begins from a correct number. Milestone 1 does not promise per-product stock history.
- Phone-friendly layout for these screens.

You can review in Preview:

1. Add a product with both SKU and barcode; search by each.
2. Try to show a 0-price product to customers and see it blocked.
3. Enter a sale price higher than the price and see the error; fix it and save.
4. Use "Draft description", edit the text, save.
5. Download the example CSV.
6. Import a test file with good and bad rows (missing price, bad sale price, duplicate barcode) and see each error; fix one on screen and save.
7. Check imported products are hidden from customers.
8. Re-import with changed price/stock; see the old vs new preview; confirm only what you tick.
9. Try a file over 500 rows and see the limit message.
10. Pick sample templates, fill price + stock, save; untouched picks are not saved.
11. Open the import record list and see each import's summary.

## 6. Milestone 2 — Minimal in-store checkout + shared stock

Builds:

- "Sell" tile: search by name, SKU or barcode (typing, or a keyboard-style scanner matching barcode), add to cart, change quantity, remove.
- **Blocked when stock is 0 or too low**; the owner corrects the stock count first.
- Payment method: **Cash, KBZPay, Wave, Other** (+ optional note). These are labels the owner records; Bago Market does not take or verify payments. Optional "cash received" -> change.
- Receipt (print dialog): shop name, sale number, date/time, items, quantities, item prices, total, payment method, short thank-you line. No customer details needed.
- Sale numbers per shop (#0001, #0002…), unique and never reused, even after a void.
- Sales list + today's total and totals per payment method (labelled revenue, not profit).
- Void a sale with a reason -> stock returns once.
- Stock history for every change from this point on (online order, cancel, in-store sale, void, manual edit, import). On launch, each product's current stock is saved once as a "starting balance" entry.
- Same stock is shared by online orders and in-store sales.

You can review in Preview: sell a test item and see stock drop on the product and shop page; print the receipt; void it and see stock return and the number not reused; try an out-of-stock item and see it blocked; tap "Complete" twice and get one sale; place an online order and see it in stock history.

## 7. Later — only after shop-owner feedback

- More templates and shop types; better description drafting (AI would need your approval for credits).
- Cost price and profit (also needs expenses: rent, staff, transport).
- Partial refunds, staff accounts, stock-count screen, weekly/monthly reports.
- Direct printer, cash drawer, camera scanning — device testing needed, no guarantees.
- Not in this plan: offline POS, payment processing, AI keys or paid AI.

## 8. Database, security and stock safety

- Products: separate optional SKU and barcode, each unique per shop; database blocks showing a product with price 0.
- Starter templates: read-only list for owners, admin-managed. **Not seeded** until the names are approved.
- Milestone 2 records: in-store sales, sale items (copied name and price at sale time), stock movements, a per-shop sale-number counter.
- Sales and voids only through secure database functions: check the caller owns the shop, lock each product, refuse if stock too low, change stock exactly once, save all-or-nothing.
- Duplicate taps / lost connection: each sale has a one-time key; resending returns the same sale.
- Online and in-store at the same moment: both lock the same product; the second is refused if stock ran out.
- Sales and stock history can't be edited or deleted directly; only the owner (and admin) can see them.

## 9. Starter catalog sample (for your review only — not seeded)

Generic names, no prices, no stock, no photos. **Local Burmese-speaking shop owners must check these names before any are used.**

Baby & Mum / ကလေးနှင့်မိခင်

- ကလေးသေးခံ (အရွယ် S/M/L) — Baby diapers (size S/M/L)
- ကလေးအစိုသုတ်စက္ကူ — Baby wet wipes
- နို့ဗူး — Baby feeding bottle
- ကလေးနို့မှုန့် — Infant formula milk
- ကလေးရေချိုးဆပ်ပြာ — Baby bath soap
- ကလေးပေါင်ဒါ — Baby powder

Phones & accessories / ဖုန်းနှင့်ဆက်စပ်ပစ္စည်း

- ဖုန်းအားသွင်းကြိုး (USB-C) — Charging cable (USB-C)
- ဖုန်းအားသွင်းခေါင်း — Phone charger adapter
- ပါဝါဘန့် — Power bank
- နားကြပ် — Earphones
- ဖုန်းအိတ် — Phone case
- မှန်ကာ — Screen protector

Beauty / အလှကုန်

- မျက်နှာသစ်ဆေး — Face wash
- နေရောင်ကာခရင်မ် — Sunscreen
- နှုတ်ခမ်းနီ — Lipstick
- ခေါင်းလျှော်ရည် — Shampoo
- သနပ်ခါး — Thanakha

Daily goods / နေ့စဉ်သုံးပစ္စည်း

- ဆန် (၁ပြည်) — Rice (1 pyi)
- စားသုံးဆီ — Cooking oil
- ဆား — Salt
- အချိုမှုန့် — Seasoning powder
- ခေါက်ဆွဲခြောက် — Instant noodles
- ရေသန့်ဘူး — Drinking water bottle

Stationery / စာရေးကိရိယာ

- ဘောပင် — Ballpoint pen
- ခဲတံ — Pencil
- လေ့ကျင့်ခန်းစာအုပ် — Exercise book
- ခဲဖျက် — Eraser

## 10. Final order and open decision

Order: Milestone 1 (product onboarding) -> Milestone 2 (in-store checkout + shared stock) -> Later (after feedback).

Your decisions recorded: 500-row limit; imports hidden by default; per-shop sale numbers, unique, never reused; payment methods Cash/KBZPay/Wave/Other; zero-stock sales blocked.

Still open: the checked Burmese names. Milestone 1 can be built without them — the template screen stays empty (or shows a "coming soon" note) until you send the approved list.

## Technical notes

- `products.sku`, `products.barcode` (text, null) with partial unique indexes per shop. Pre-check query for `is_active and price <= 0`; trigger rejects showing a product with `price <= 0` only on insert/update (existing rows untouched). `products_validate` changed to raise an error for an invalid sale price instead of nulling it.
- `product_imports` (shop, user, file name, added/updated counts), owner-only RLS.
- `product_templates` (admin write, authenticated read), created empty. Template picks held in React state until valid; insert via existing products RLS.
- CSV parsed in browser (papaparse) + zod; diff preview client-side; batched inserts/updates under RLS. Description draft is a pure function in `src/lib/domain` with tests.
- Milestone 2: `pos_sales`, `pos_sale_items`, `stock_movements`, `pos_sale_counters`; one-time opening-balance rows in `stock_movements` from current stock; RPCs `pos_create_sale(..., idempotency_key)`, `pos_void_sale(id, reason)`; `place_order` / `update_order_status` log movements. Rules mirrored in `src/lib/domain/rules.ts` with tests; labels in `dict.ts`; receipt via `window.print()`.
