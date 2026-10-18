# Bago Market — Premium Visual Redesign

A visual-only redesign of the existing app. No changes to the database, security rules, cart, checkout, orders, merchant or admin logic.

## Design direction: "Editorial Bago"
- Colors: deep forest green (main), warm ivory and cream backgrounds, a little champagne gold, charcoal text, soft sage for secondary areas.
- Depth: soft layered shadows used only on the hero, category tiles and product cards. Flat everywhere else.
- Type: an elegant serif-style display font for English headings, paired with Padauk / Noto Sans Myanmar for Myanmar, with extra line height so Myanmar text never gets clipped.
- Motion: gentle lift on hover, slow image zoom, button transitions. All turned off for people who prefer reduced motion.

## Homepage
1. **Header**: compact two-tier bar: logo mark plus wordmark, location picker, wide search, divider, language toggle, account, cart with gold badge. Mobile keeps the bottom nav.
2. **Hero**: editorial split layout. Strong Myanmar headline, short copy, buttons "စျေးဝယ်မယ်" / "ဆိုင်ဖွင့်မယ်". Layered photo collage (produce, textiles, groceries) with two small floating image cards and slight depth. Stacks cleanly on mobile.
3. **Categories**: image-led tiles with cropped photos and name labels. A large bento layout for the top categories (Food, Groceries, Fashion), then a horizontal row of smaller photo tiles for the rest. Uses the real categories and their translations.
4. **Featured shops**: a new card style with a cover strip, round logo, name, category, township, and delivery/pickup chips. Ratings appear only if a shop has real ratings.
5. **Popular products**: larger square photos, clear MMK price, stock status, and a refined add-to-cart button. Favorites are skipped because that feature doesn't exist.
6. **Rhythm**: promotions as an editorial banner strip, a food section on a sage background, and a "near you" section. Repeated sections are removed.

## Rest of the site
The same tokens and card styles carry over to the category, search, shop, product, cart, checkout, orders, account, merchant and admin pages. The changes there are styling only: the new cards and headers, with no change to how anything works.

## Images
- Generate about 6 hero/collage photos and 12 category photos, stored with the app.
- Category photos are matched by the category's link name, falling back to the icon. A real shop or product photo always takes priority. Swapping a photo means replacing one file.

## Technical details
- Tokens updated in `src/styles.css` (ivory/sage/champagne, shadow tokens `--shadow-soft/--shadow-lift`, `@utility` lift/zoom, `prefers-reduced-motion` guard). Display font loaded via `<link>` in `__root.tsx`.
- Edits: `shell.tsx` (header/footer), `bits.tsx` (Section, Logo), `cards.tsx` (ShopCard, ProductCard), `routes/index.tsx`, plus a new `src/lib/category-images.ts` slug-to-asset map. Light class updates on other routes.
- All new labels added to `src/lib/i18n/dict.ts` in Myanmar and English.
- No new dependencies, and no backend changes.
- Verification: the existing Vitest suite, then Playwright screenshots at 1350px, 768px and 390px of home, category, shop, product and cart, checking for horizontal overflow, console errors, language switching and adding to cart.
