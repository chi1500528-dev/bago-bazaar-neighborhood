# Bago Market — Finish the Premium UI/UX Refinement

The colours, category circles, bigger product cards and footer fix are already done. This plan finishes the rest of the brief across every page. Looks only: no changes to the database, cart, checkout, orders, merchant or admin logic.

## 1. One shared text-size system
- Set clear sizes for the whole app: body 16px, secondary text 14–15px, product names 16px, prices 18–20px, section headings 24px, page headings 28–32px.
- No text smaller than 13px anywhere (the bottom menu labels and cart counters are 10–11px now).
- Comfortable line spacing for Myanmar text so tone marks and vowels are never cut off.
- Less bold text; size and colour create the hierarchy instead.

## 2. Consistent buttons, fields and cards
- One button height (44px main, 40px small), one input height (44px), the same rounded corners and card padding everywhere.
- Clear keyboard focus outline in forest green.

## 3. Navigation
- Phone bottom menu: taller (about 60px), 13px labels, larger counters on the cart, a clear active marker, safe space for the iPhone home bar.
- Desktop header: subtle active marker for the current page and the same icon sizes.

## 4. Homepage tidy-up
- Show at most one empty message per page. Sections with no content (food, near you) collapse into one small message with a useful next step instead of repeated boxes.
- Choosing a township stays easy to find.

## 5. Apply to every page
Page headings, cards, empty states and buttons follow the same system on: categories, category page, search, shop, product, cart, checkout, orders, order detail, account, sign in, info pages, merchant and admin.

## 6. Check the result
- Run the existing tests and type check.
- Take screenshots at 360, 390, 768 and 1280px of the homepage, category, shop, product, cart and checkout pages. Check for sideways scrolling, cut-off Myanmar text, overlapping controls and console errors.
- Switch languages and add a product to the cart as a quick check.

## Technical details
- Tokens in `src/styles.css`: switch secondary and sidebar colours to the brief's hex values, keep muted text at #5F665F (the brief's #747B75 fails contrast on ivory), add `@utility` text scale helpers (`text-body`, `text-meta`, `text-price`, `heading-page`, `heading-section`), plus a `:focus-visible` ring.
- `button.tsx` / `input.tsx` size variants bumped to 44/40px.
- `shell.tsx`: bottom nav sizing, badges, active indicator, `env(safe-area-inset-bottom)`. `StickyActionBar` offset updated to match the new nav height.
- `bits.tsx`: `Section` heading scale, a compact `EmptyState` variant, a shared `PageHeading`.
- `index.tsx`: merge empty food / near-you sections into one compact message.
- Replace the remaining `text-xs` / `text-[10–11px]` labels across routes with the new scale.
- Any new labels go into `src/lib/i18n/dict.ts` in Myanmar and English.
