# Bago Market on phones: installable app now, native-ready backend

Lovable can't build separate native Android/iOS apps (Expo/React Native). This plan covers two things. First, it turns this site into an app people can install on their phone today. Second, it prepares everything a native app built later in Codex/Expo needs, so that app can use the same backend.

## Part A — Installable phone app (in this project)
- Shoppers can add Bago Market to their home screen. It opens full-screen with its own icon, name (ပဲခူးဈေး) and forest-green theme.
- A bottom menu appears on phones only: Home, Categories, Search, Cart (with item count), Account. Desktop stays as it is.
- Phone polish: room around the notch and home bar, bigger tap targets, sticky "add to cart" and checkout buttons, and forms that stay usable when the keyboard is open.
- No offline mode. Live prices and stock always come from the server, so shoppers never see out-of-date ones.

## Part B — Native-ready foundation (shared code + guide)
- Keep shared logic free of web-only code (cart one-shop rule, totals, order steps, MMK formatting, translations), so a React Native app can reuse it as-is.
- Write a `docs/mobile-native.md` guide in plain language covering:
  - what already works vs. what is still missing
  - the real database tables, the order and cancel database functions, and the access rules the app must follow
  - how a mobile app signs in through Supabase and handles redirect links
  - how to load private images through signed links
  - the recommended Expo folder layout, which shared files to reuse, and the EAS build steps for Android and iOS
  - a dependency checklist for each mobile feature
- The website itself won't be redesigned, and no database changes are needed.

## Technical details
- `public/manifest.webmanifest` plus 192/512 and Apple touch icons (generated); manifest, theme-color and apple-touch-icon links added in `__root.tsx` head. No service worker.
- New `src/components/site/mobile-tabbar.tsx`, shown below `md` in `PageShell`; labels go in `dict.ts`; bottom spacing uses `env(safe-area-inset-bottom)`; `viewport-fit=cover`.
- Check `src/lib/domain/rules.ts` and `src/lib/i18n/dict.ts` for DOM/Vite imports; add an AGENTS.md rule that they must stay platform-neutral.
- Verify with Playwright at a 390x844 phone size; run the existing tests.

## Out of scope
- The actual Expo app code, app-store submission, and push notifications. These need native tooling outside Lovable.
