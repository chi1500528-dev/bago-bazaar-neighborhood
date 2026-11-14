# Shop-owner first experience + fixes

## 1. Shop owners land on their shop
- When a signed-in user owns a shop, opening the app goes straight to "My Shop" (the merchant dashboard) instead of the customer home page. A "View as customer" link takes them to the shop-front any time.
- Redesign "My Shop" as one clean screen with 4 large tiles: **Orders** (new count badge), **Messages** (unread badge), **Products**, **Shop details**. Each tile opens its own simple page with a back button.
- Header: shop owners get a clear "My Shop" button; customers never see merchant controls.
- Bottom tab bar on phones for owners: My Shop / Orders / Messages / Products.

## 2. Owners add their own categories
- In Products, owners can create, rename and delete their own product categories (e.g. "Baby clothes", "Diapers") used only inside their shop.
- Shop page shows these as filter chips so customers browse by them.
- Main marketplace categories (Beauty, Electronics...) stay admin-controlled to keep the market tidy.

## 3. New home banner
- Replace the vegetables banner with a premium, modern image in the same soft ivory/studio style as the "More categories" photos (mixed products: cosmetics, phone, home décor, baby items). Text and button stay the same.

## 4. Fix: account info changes on refresh
- Cause: the page shows the email name first, then swaps to your saved name when it loads. Fix: show a short loading placeholder until your saved details arrive, so it never jumps.

## 5. Fix: shop address still says "uedc-myanmar"
- Cause: the shop web address is created once from the first name and never updated when renamed.
- Fix: when an owner changes the shop name, the address updates (e.g. /shops/aye-myit-tar-baby-mum-store). Old links automatically redirect to the new one so shared links don't break. Your existing shop gets updated now.

## 6. Full check
- Walk through every customer and owner flow (sign up, browse, cart, checkout, orders, chat, notifications, shop setup, products) in the browser on phone and desktop sizes and fix anything broken.

## Technical details
- Root/index loader: if user has a shop (via `shops.owner_id`), redirect `/` → `/merchant` once per session (client-side, after auth).
- Split `merchant.tsx` into `merchant/` sub-routes (index tiles, orders, messages, products, shop).
- New table `shop_categories (id, shop_id, name, sort)` + `products.shop_category_id`; RLS: public read when shop public, owner write via `is_shop_owner`; grants included.
- New table `shop_slug_history (old_slug, shop_id)`; on name change regenerate slug via `slugify`; `shops.$slug` loader falls back to history and redirects.
- Account: gate render on profile query (react-query) instead of email fallback.
- All new text in `dict.ts` (Myanmar + English).
