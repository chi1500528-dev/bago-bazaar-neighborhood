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
- No SKU/barcode field.
- No in-store sales, receipts or sales history.
- No stock history. No cost price (so no profit).

## 3. Important: what a CSV import is (and is not)
- It is a **one-time copy** of the owner's product list from their other POS.
- It is **not** a live connection. Sales made later in the other POS will not change Bago Market stock.
- To keep online stock correct, a shop should record future in-store sales in Bago Market (Milestone 2). This message is shown on the import screen in Burmese and English.

## 4. Product price and stock rules (checked in the current database)
- Price is **required** (a whole MMK number, 0 or more). Stock is required (defaults to 0, never below 0). Sale price must be lower than price or it is dropped.
- So a product can never be saved without a price. Templates and CSV rows without a price stay as **unsaved drafts on the screen**: the owner fills price and stock, and only then are they saved. No empty or fake-price products are stored.
- Saved imported products start **hidden from customers** by default; owner can tick "Show to customers now".

## 5. Milestones

### Milestone 1 — Product onboarding
Builds:
- SKU/barcode field on products (optional, unique within one shop).
- Products tab -> "Add products": Add one / From starter catalog / Import CSV.
- **CSV import**: download example file -> upload -> match columns -> preview -> save.
  - Fields: name (required), price (required), sale price, stock, SKU/barcode, shop category (created if new), description. Photos are added afterwards.
  - Row errors shown clearly, e.g. "Row 12: price is not a number", "Row 30: barcode used twice in this file". Rows with errors are not saved; the rest can be.
  - Up to about 500 rows per file.
- **Safe re-import / duplicates**:
  - Row barcode matches an existing product -> shown as "Update", with old vs new for every changed field (price, stock, name...). Nothing changes until the owner ticks each update (or "accept all shown") and confirms. Default is **don't change price or stock** unless the owner ticks them.
  - Same barcode twice in the file -> both rows flagged, neither saved until fixed.
  - Row has no barcode -> always treated as a new product; if a product with the same name already exists, a "possible duplicate" warning appears and the owner chooses Add anyway or Skip.
- **Starter catalog sample** (small, see section 7): search, tick items, fill price + stock on the same screen, save. Nothing is saved for items left blank.
- Phone-friendly layout for these screens.

Review in Preview: open My Shop -> Products -> Add products; download the example file, import a test file with good and bad rows, re-import it with a changed price and see the change preview; pick some sample templates and save them.

### Milestone 2 — Minimal in-store checkout + shared stock
Builds:
- "Sell" tile: search by name or SKU/barcode (typing or a keyboard-style scanner), add to cart, change quantity, remove.
- **Blocked when stock is 0 or too low**; message tells the owner to correct the stock count first.
- Complete sale: payment method **Cash, KBZPay, Wave, Other** (+ optional note). These are only labels the owner records; Bago Market does not take or check payments. Optional "cash received" -> change.
- Receipt: shop name, sale number, date/time, items, quantities, item prices, total, payment method, short thank-you line. No customer details needed. Printed with the phone/computer print dialog.
- Sales list + today's total and totals by payment method (labelled revenue, not profit).
- Void a sale with a reason -> stock goes back once.
- Stock history: every change (online order, cancel, in-store sale, void, manual edit, import) is logged.

Review in Preview: sell a test item, see stock drop on the product and on the shop page, print the receipt, void it and see stock return, try selling an out-of-stock item and see it blocked, tap "Complete" twice and see only one sale.

### Later — after shop-owner feedback
- More templates and shop types.
- Description drafting: version 1 is a simple template that only reuses what the owner typed (brand, size, colour, model, material, condition); owner edits before saving. No AI is set up now; AI would use Lovable credits and needs your approval later.
- Cost price and profit estimates (also need expenses such as rent, staff, transport).
- Partial refunds, staff accounts, stock-count screen, reports by week/month.
- Direct printer / cash drawer / camera scanning — device testing needed, no guarantees.
- Not in this plan: offline POS, payment processing, AI keys or paid AI.

## 6. Database, security and stock safety (for Milestones 1-2)
- Products get an optional SKU/barcode, unique per shop.
- Starter templates stored in a read-only list (admin-managed); owners only copy from it.
- New records: in-store sales, sale items (with **copied name and price at sale time**), stock movements.
- Sales and voids only through secure database functions that check the caller owns the shop, lock each product, refuse if stock is too low, change stock exactly once, and save everything together or nothing.
- **Duplicate taps / lost connection**: each sale carries a one-time key; resending returns the same sale.
- **Online and in-store at the same moment**: both lock the same product row; the second waits a split second and is refused if stock ran out.
- Sales and stock history cannot be edited or deleted directly; only the owner (and admin) can see them.
- CSV updates go through the existing owner-only product rules.

## 7. Starter catalog sample (for your review — not seeded)
Generic names only, no prices, no stock, no photos.

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

## 8. Still needs your decision
1. Are these Burmese/English names right, and which shop types should be in the first sample?
2. CSV limit of about 500 rows per file — enough?
3. Imported products hidden from customers by default — OK?
4. Sale number style: per shop (e.g. #0001, #0002) — OK?

## Technical notes
- `products.sku text null` + partial unique index (shop_id, lower(sku)).
- `product_templates` (admin RLS write, authenticated read). Template picks held in React state until valid; insert via existing products RLS.
- CSV parsed in browser (papaparse) + zod; diff preview computed client-side; updates in batches under RLS.
- Milestone 2: `pos_sales`, `pos_sale_items`, `stock_movements`; RPCs `pos_create_sale(..., idempotency_key)`, `pos_void_sale(id, reason)`; `place_order` / `update_order_status` amended to log movements. Rules mirrored in `src/lib/domain/rules.ts` with tests. All labels in `dict.ts`. Receipt via `window.print()` + print CSS.
