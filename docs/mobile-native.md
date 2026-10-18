# Bago Market — Native Android & iOS app guide

This guide is for whoever builds the native app (Expo + React Native + TypeScript) in Codex or locally. The website and the native app share **one Supabase backend**. The app must use the real schema below and must not wrap the website in a WebView.

## 1. What already works (website + backend)
- Browsing: home, categories, category pages, shop pages, product pages, search, township filter.
- Bilingual UI: Myanmar (default, Unicode only) and English.
- Accounts: email + password sign-up and sign-in (Supabase Auth). Profiles store language and township.
- One-shop cart, checkout with shop delivery or customer pickup, pay on delivery/pickup only.
- Orders: customer order history and detail, customer cancel while pending.
- Merchant dashboard (shop setup, products, order status). Admin dashboard (approve shops, categories, townships, promotions).

## 2. Still missing / to decide
- Push notifications (need Expo Notifications + a device-token table, not built yet).
- Phone OTP sign-in, Google/Apple sign-in (not configured).
- Online payments (intentionally none — never fake a payment success).
- Ratings/reviews (do not invent any).

## 3. Database (Supabase project `rvgqgtjkqmvjauqofsgt`)
Tables: `townships`, `categories`, `shops`, `products`, `promotions`, `profiles`, `user_roles`, `orders`, `order_items`, `order_status_history`.

Key rules (enforced in the database by RLS, the app cannot bypass them):
- Public can read only active categories/townships, approved+active shops, and active products of public shops.
- Roles live only in `user_roles` (`admin`, `merchant`, `customer`). Check them with `has_role`, never from local storage.
- Orders cannot be inserted directly. Always call:
  - `rpc('place_order', { p_shop_id, p_items: [{product_id, quantity}], p_method: 'delivery'|'pickup', p_recipient_name, p_phone, p_township_id, p_address, p_note, p_idempotency_key })` → order id. The server recalculates prices, stock, and fees.
  - `rpc('update_order_status', { p_order_id, p_status })` — customers may cancel only while `pending`.
- Error messages start with codes: `SHOP_UNAVAILABLE`, `METHOD_UNAVAILABLE`, `OUT_OF_STOCK`, `PRODUCT_UNAVAILABLE`, `INVALID_TRANSITION`. Map them using `errorKey()` from shared rules.
- Generate a fresh UUID per checkout attempt as `p_idempotency_key` so double taps never create two orders.

## 4. Sign-in from the app
- Use `@supabase/supabase-js` with `AsyncStorage` (or `expo-secure-store`) as auth storage, `detectSessionInUrl: false`.
- URL: `https://rvgqgtjkqmvjauqofsgt.supabase.co`, publishable key from `.env` (safe to ship). Never ship the service-role key.
- Email confirmation links: add the app scheme (e.g. `bagomarket://auth-callback`) to Supabase → Authentication → URL Configuration → Redirect URLs.

## 5. Images
Images are in the **private** `media` bucket. The database stores paths, not URLs. Get a viewable link with:
`supabase.storage.from('media').createSignedUrl(path, 3600)`. Cache signed URLs (e.g. with `expo-image`) for less than their expiry.

## 6. Shared code to reuse
Copy or link these files. They have no web-only imports:
- `src/lib/domain/rules.ts` — MMK formatting, sale price, one-shop cart rule, totals, order status steps, error codes.
- `src/lib/i18n/dict.ts` — every Myanmar/English label.
- `src/integrations/supabase/types.ts` — generated database types.

Recommended later: move them into a `packages/shared` folder in a monorepo. Do not move the website.

## 7. Suggested Expo layout
```text
mobile/
  app/(tabs)/index.tsx categories.tsx search.tsx cart.tsx account.tsx
  app/shop/[slug].tsx  app/product/[id].tsx  app/checkout.tsx  app/orders/[id].tsx  app/auth.tsx
  src/lib/supabase.ts  src/shared -> ../../src/lib (domain, i18n)
  app.json (two bundle ids: Android package + iOS bundleIdentifier)
```
Fonts: Padauk (Myanmar), Figtree (Latin). Colors: forest green primary, ivory background, champagne gold accents, charcoal text, sage secondary.

## 8. Builds (EAS)
1. `npm i -g eas-cli && eas login`
2. `eas build:configure`
3. Android: `eas build -p android` (Play Store needs a Google Play developer account).
4. iOS: `eas build -p ios` (needs an Apple Developer account, $99/yr).
5. `eas submit` to upload to the stores.

## 9. Feature dependency checklist
| Mobile feature | Backend ready? |
|---|---|
| Browse, search, shop, product | Yes |
| Sign up / sign in (email) | Yes (add app redirect URL) |
| Cart + checkout | Yes (`place_order`) |
| Order history + cancel | Yes |
| Live order status | Add `orders` to Supabase Realtime publication |
| Push notifications | No — needs device-token table + sender |
| Phone OTP / social sign-in | No — configure in Supabase Auth |
