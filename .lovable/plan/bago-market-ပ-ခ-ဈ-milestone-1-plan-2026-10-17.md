# Bago Market (ပဲခူးဈေး) — Milestone 1 Plan

A fresh project. Goal: the full end-to-end marketplace flow running on real data, Myanmar first, with English available.

## What gets built

**Brand and design**
- Wordmark "Bago Market / ပဲခူးဈေး" with a simple shopping-bag mark.
- Colors: deep forest green for main actions, muted gold used sparingly, warm white background, charcoal text.
- Fonts: Padauk / Noto Sans Myanmar for Myanmar text, Figtree for Latin text. Generous line height so Myanmar labels never get cut off.
- Subtle borders, slightly rounded corners, little animation.

**Language**
- Myanmar on first visit, with a header switch (မြန်မာ / English).
- Choice saved on the device for guests and on the profile for signed-in users.
- All interface text comes from one shared translation file. Shop-entered text is shown as typed, never auto-translated.

**Customer pages**
- Home, in this order: header with township picker and search, short hero ("ပဲခူးမြို့ရဲ့ ဈေးဆိုင်စုံ၊ ပစ္စည်းစုံ"), category tiles, weekly promotions (or a fallback when none exist), featured shops, popular products, food & restaurants, shops in your township, footer.
- One reusable category page with subcategories, filters (township, price, availability, delivery/pickup), sorting and paging.
- Search across products, shops and categories in both languages, with a short typing delay and paged results.
- Shop storefront, product detail page, and a cart limited to one shop (with a "keep current cart / replace" prompt).
- Checkout with shop delivery or customer pickup. Order history and order status pages.
- Mobile bottom bar: Home, Categories, Orders, Cart, Account.
- Footer pages: About, Contact, Help/FAQ, Terms, Privacy (short honest placeholder text).

**Merchant dashboard**
- Register a shop (it waits for admin approval), edit details, upload logo and cover, set township, hours, delivery/pickup and delivery fee.
- Add, edit and deactivate products, with images, category, price, sale price and stock.
- Incoming orders list and detail, with allowed status steps: Pending → Confirmed → Preparing → Ready/Out for delivery → Completed, or Cancelled. Updates appear live.

**Admin dashboard**
- Approve, reject, activate or suspend shops.
- Look through products and orders.
- Manage categories and subcategories (Myanmar + English names, order, on/off).
- Manage homepage promotions (image, titles, link, start/end dates, on/off).
- Simple counts of shops, products and orders.

**Accounts**
- Email and password sign-in. Roles: customer (default), merchant (on creating a shop), admin (assigned in the backend).
- Heads-up: the first admin has to be granted manually once you sign up. I'll walk you through it.

**Starting content**
- The 12 categories and example subcategories from the brief, plus the Bago Region townships (Bago, Taungoo, Pyay, Tharrawaddy, Nyaunglebin, and others).
- No fake shops, products, ratings or reviews. Sections with nothing in them yet show a helpful empty message.

## Out of scope (as the brief says)
Drivers, GPS, multi-shop checkout, real payments (orders are cash on delivery or pay at pickup, clearly labeled), coupons, loyalty points, analytics, chat, native apps.

## Technical details
- Lovable Cloud for the database, sign-in, image storage and live updates.
- Tables: profiles (language, default township), user_roles + has_role(), townships, categories (parent_id, name_my, name_en, sort, active), shops (owner, status pending/approved/rejected/suspended, is_active, delivery/pickup flags, delivery_fee, hours as JSON, is_food), shop_service_townships, products (shop, category, names/descriptions in both languages, price, sale_price, stock, active), product_images, promotions, orders (snapshot of totals, delivery method, recipient details, status, idempotency_key unique), order_items (price snapshot), order_status_history.
- Access rules: the public sees only approved, active shops and their active products. Owners manage only their own shops, products and orders. Customers see only their own orders. Admin rules go through has_role. Status changes go through a database function that only allows valid steps for each role.
- Order placement: one transaction-safe database function, place_order(shop, items, method, address, idempotency_key). It re-reads prices, stock and delivery fee, checks the shop is open for business, reduces stock and writes snapshots. The cart in the browser is never trusted for totals.
- Storage buckets: shop-media and product-media, public to read, writable only by the owner's folder.
- Search: trigram indexes on names in both languages, paged queries.
- Code layout: shared `src/lib/domain` (types, validation with zod, money formatting, status rules) and `src/lib/i18n` (keys), kept separate from the screens so a future Expo app can reuse them.
- Routes: /, /categories, /c/$slug, /search, /shops/$slug, /p/$id, /cart, /checkout, /orders, /orders/$id, /account, /auth, /merchant/*, /admin/*, plus footer pages. Every page gets its own title and description.
- Tests for: one-shop cart rule, allowed order status steps, and the total calculation.
- Check Myanmar and English layouts at mobile, tablet and desktop widths before calling it done, and write up known limitations at the end.
