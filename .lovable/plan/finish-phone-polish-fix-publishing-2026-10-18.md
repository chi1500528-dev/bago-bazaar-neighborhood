# Finish phone polish + fix publishing

## 1. Getting the site online
- Netlify fails because this project is set up to run on Lovable's own hosting, not Netlify. The pages are built on the server, and Netlify expects a different setup.
- Recommended: use the **Publish** button in Lovable. It works without any changes and gives a free address (e.g. bago-bazaar-neighborhood.lovable.app). You can connect your own domain later.
- If you must use Netlify, that needs a separate, larger change to the project's build setup. It is not part of this plan, so ask for it separately.

## 2. Remaining phone polish (from the earlier plan)
- Product page: a sticky "add to cart" bar at the bottom on phones, sitting above the bottom menu.
- Cart and checkout: a sticky total and "place order" button on phones.
- Bigger tap targets (at least 44px) for quantity buttons, menu items and form controls.
- Forms (sign-in, checkout, merchant forms): phone-friendly keyboards for phone numbers and numbers, and fields scroll into view when the keyboard opens.
- Room for the notch and home bar on the sticky bars.

## 3. Checks
- Test at phone size (390x844): home, product, cart, checkout, sign-in. Also check adding to cart and switching to English.
- Run the existing tests.

## Technical details
- Sticky bars use `fixed bottom-[calc(tabbar+env(safe-area-inset-bottom))] md:hidden`, with page bottom padding so nothing is hidden behind them.
- `inputMode="tel"`/`"numeric"`, `autoComplete`, and `scroll-margin` on inputs.
- New labels go in `dict.ts` only. No database or business-rule changes.
