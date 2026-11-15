# Bago Market — Audit and Improvement Plan

## 1. What already works today
- Customers: browse home, categories, shops, products, search; one-shop cart; checkout with shop delivery or pickup (pay on delivery/pickup); order tracking; chat with shops; account page.
- Shop owners: "My Shop" screen with 4 tiles (Orders, Messages, Products, Shop details); owners create, rename and delete their own product categories; renaming a shop updates its web address and old links still work.
- Owners are sent to "My Shop" when they open the home page (once per visit).
- Sign up / sign in with email + password, with a Resend email code (6–8 digits) and "resend code" timer.
- Admin: approve shops, manage marketplace categories, promotions, townships.
- Safety: roles kept in their own table, checked on the server; prices and stock are checked by the database, never trusted from the phone.

## 2. Gaps found in the audit
- My Shop only knows about ONE shop. An owner with two shops can only manage the first one.
- The "go to My Shop" jump happens only once per visit and only from the home page; after sign-in the owner can still land on the customer pages.
- Owners have no quick "today" summary (new orders, unread messages, low stock) on the My Shop screen.
- Stock is a single number per product; there is no history of why stock changed.
- No sales or profit numbers anywhere. Products have no cost price, so profit cannot be calculated yet.
- Sign-in / sign-up screen is plain and does not match the premium style of the rest of the app.
- Note: the login/register screenshots you mentioned did not come through with this message; the auth design below follows our existing style. Please re-attach them if you want me to match them more closely (invite-code field will not be added either way).

## 3. Immediate UX fixes (no hardware, small database changes)
1. Owner lands in My Shop every time: right after sign-in, and whenever they open the app, unless they tapped "View as customer".
2. Shop switcher: if an owner has more than one shop, a simple picker at the top of My Shop.
3. "Today" strip on My Shop: new orders, unread messages, products low on stock — each tap opens the right tile.
4. Clean premium sign-in / sign-up: one card, logo on top, two tabs (Sign in / Create account), large fields, show/hide password, clear Myanmar error messages, same 6-digit code step. Works well on small phones.
5. Customer side stays as is, with small polish: clearer empty states and back buttons already in place.

## 4. Later features (need decisions first)
Needs new data (schema) but no hardware:
- Sales report: daily / weekly totals from completed orders. Can start soon, uses existing order data.
- Profit report: needs a "cost price" on each product — owners must enter it.
- Stock history: every sale, return and manual adjustment recorded; low-stock alerts.
- In-store POS (counter checkout): owner taps products, takes cash, stock goes down, sale appears in the same reports as online orders. Needs a decision: do in-store sales count as "orders" or a separate "sales" list? Do you need cashier staff accounts separate from the owner?

Needs hardware decisions:
- Barcode scanner: USB/Bluetooth scanners that "type" the code work in the browser easily. Camera scanning on phones also possible. Needs: barcode field on products.
- Receipt printer: browser printing to a normal or 58/80mm thermal printer works via the print dialog. Silent one-tap printing needs the Android app (Capacitor) plus a specific printer model — tell me which printers shops use.
- Cash drawer: usually opens through the receipt printer, so it follows the printer decision.

## 5. Blockers
- Hosting/network: bagomarket.shop is still unreliable on some Myanmar mobile networks; this is separate from the app itself and continues on the VPS track.
- Profit needs cost prices from owners.
- POS hardware needs printer/scanner models chosen.
- Staff (cashier) accounts need your decision on who can see money numbers.

## 6. First milestone (preview before publishing)
Small and reviewable in the preview:
1. Owner always lands in My Shop after sign-in and on app open (with "View as customer").
2. Shop switcher for owners with several shops.
3. "Today" summary strip on My Shop (new orders, unread messages, low stock — low stock = 5 or fewer, adjustable later).
4. Redesigned premium sign-in / sign-up screen, same email + password + email code behaviour.
No new database tables in this milestone. I will check it in the browser as a customer and as a shop owner on phone and desktop sizes before you publish.

## Technical details
- Landing: move owner redirect into a shared check (after `onAuthStateChange` SIGNED_IN and on `/`), replace once-per-session flag with a "customer mode" flag set by "View as customer".
- Multi-shop: merchant query drops `.limit(1)`; selected shop id in `?shop=` search param (keeps `?tab=` pattern).
- Today strip: counts from existing `orders` (status pending), `conversations` (shop_last_read < last_message_at), `products` (stock <= 5, active) — RLS already scopes to owner.
- Auth UI: rewrite `src/routes/auth.tsx` layout only; keep `signUp`, `signInWithPassword`, `verifyOtp` calls and `OtpStep` logic. All text in `dict.ts`.
- Later schema (not in milestone): `products.cost_price`, `products.barcode`, `stock_movements`, POS sales via a SECURITY DEFINER function mirroring `place_order`, `shop_staff` table for cashiers.
