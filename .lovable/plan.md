# Bago Market UI/UX polish (storefront + shop owner workspace)

Look-and-layout changes only. No new features, routes, tables, fake ratings or promos. Prices, stock, POS checkout, reports, receipts, CSV import and both languages keep working exactly as now.

Not touched: `src/lib/sb-relay.ts`, `src/routes/api/public/sb/$.ts`, `src/integrations/supabase/*`, `supabase/*`, `src/lib/pos.ts`, `src/lib/stock.ts`, `src/lib/reports.ts`, `src/lib/domain/*`, `capacitor.config.ts`, `netlify.toml`.

## Part 1 - Shared look (`src/styles.css`, `src/components/site/shell.tsx`, `src/components/ui/button.tsx`, `input.tsx`)
- Keep forest green, ivory page background and the three fonts. Add a pure white `--surface` token for product and card areas, plus a softer 1px hairline border token. Turn down the shadows.
- Corners: buttons and inputs `rounded-xl`, cards and dialogs `rounded-2xl`, `rounded-full` only for small badges. The card's "Add to cart" button (currently `rounded-full`) changes to `rounded-xl` to match the product page.
- Header stays one slim row with a translucent white background and a 1px bottom line.
- Language switch: take it out of the footer (shell line ~389). It stays in the header on all sizes and on the Account page.
- Add a `num` utility (tabular numbers) and use it on every MMK price, KPI, stock count and POS/report figure.
- Burmese text gets `leading-relaxed` by default, and headings get `text-wrap: balance` so a single syllable doesn't end up alone on the last line.

## Part 2 - Storefront
**Home (`src/routes/index.tsx`)**
- Remove the search form in the big top section; the header search is the only one. The top becomes a short headline and subtitle with no heavy green box.
- Replace the quick pills, the category tiles and "More categories" with one horizontal category strip (small photo + short label) and one "See all" link to the Categories page. Short Burmese labels come from new keys in `dict.ts`, falling back to the full name.
- If Specials or Food shops have nothing in them, don't show the section.
- Featured shops: with 1-2 shops, show a wide spotlight layout of up to 2 columns. Popular products: with 1-3 items, the number of desktop columns matches the item count (phones stay at 2 columns).

**Product card (`src/components/site/cards.tsx`)**
- White square image area with a 1px border and padding, so photos aren't letterboxed.
- Title is `line-clamp-2 min-h-[2.75rem]`. Price and button sit at the bottom with `mt-auto`, so cards in a row line up.
- "In stock" becomes a small pill with a green dot. No stock numbers, same as now.

**Categories (`src/routes/categories.tsx`)**: even 2-column (phone) / 3-4-column (desktop) grid with equal-height cards. Subcategories move into a small expandable list inside each card.

**Product page (`src/routes/p.$id.tsx`)**: white image area with a border, a breadcrumb (Home / Category / Product) using data already loaded, a description that keeps its line breaks at `max-w-prose`, and matching `rounded-xl` buttons for quantity, Add to cart and Chat.

**Shop page (`src/routes/shops.$slug.tsx`)**: the cover photo gets a soft dark-to-clear fade, with a round logo, name and tagline, and pill badges for delivery, pickup and township. When township and city are the same, the address shows the name once (no "Bago, Bago"). This is a display-only check.

## Part 3 - Shop owner workspace (top priority)
**Navigation (`src/routes/merchant.tsx`)**: a tab bar that is always visible for Sell, Orders, Products, Reports, Chat and Shop, using the existing `?tab=` links. It scrolls sideways on phones and sits as a plain row on desktop. The 6-tile launcher is no longer needed to switch tabs.

**Today strip (`TodaySummary`)**: In-store today and Online today shown side by side as the main figures, then 4 small clickable chips (Today's orders, Pending, Unread chat, Low stock) that open the matching tab and filter. Same numbers and same Yangon-day rules, just without cards nested inside cards.

**POS (`src/components/site/pos.tsx`)**
- Desktop: two columns. Left has a large search box and even white product tiles (name, bold price, small stock badge, tap to add). Right has a receipt-style cart that stays in view (line items, small -/+ buttons, divider lines, payment method pills, cash received and change, one strong Checkout button).
- Phone: product grid plus a bar fixed at the bottom ("X items · Total · Checkout") that opens the existing cart/payment sheet.
- Checkout calls, saved-sale protection and payment methods stay exactly the same.

**Products & stock (`merchant.tsx`, `stock-actions.tsx`)**: a list with divider lines instead of stacked boxes, stock status badges, and tidy Edit / Receive stock / Correct count / Cost buttons. The Receive, Correct and CSV import windows get more space and clearer labels. Their fields and checks stay the same.

**Reports & settings (`reports.tsx`, `receipt-settings.tsx`, `order-detail.tsx`)**: date ranges and POS / Online switches become segmented controls. Revenue, cost of goods and gross profit get clear sizes and tabular numbers, and all existing labels and "unknown cost" notes stay. Shop profile and Receipt settings get section headings and 1px dividers. Order detail gets the same spacing and corners.

## Checks before reporting done
- Tests, TypeScript, lint (0 errors) and build.
- Screens at 360, 390 and 1280px in Myanmar and English: home, categories, product, shop, cart, merchant Sell/Orders/Products/Reports/Shop. No sideways scrolling, and tap targets at least 44px.
- One signed-in POS sale and one stock receive in the preview, to confirm nothing changed in how they work.

## Delivery
Three commits, one per part. Part 3 goes first because it's the top priority.
