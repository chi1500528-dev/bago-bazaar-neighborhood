<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- UI text lives only in `src/lib/i18n/dict.ts` (Myanmar default, English second); never hard-code labels — keeps both languages in sync and reusable by a future native app.
- Pure business rules (cart one-shop rule, totals, order status steps) live in `src/lib/domain/rules.ts`; the database functions `place_order` / `update_order_status` are the authority and must stay in sync — the browser is never trusted for money.
- Data is read via the browser Supabase client + react-query; access control is enforced by RLS, not by hiding UI.
- Images go to the private `media` bucket under `{userId}/...`; DB stores the path and `MediaImg` resolves signed URLs — public buckets are blocked on this project.
- Admin, merchant and shop-approval flags are guarded by the `shops_guard` trigger; merchants can never self-approve.
- Category fallback photos map by slug in `src/lib/category-images.ts`; real uploaded media always wins — keeps placeholder imagery swappable.
- `src/lib/domain/*` and `src/lib/i18n/dict.ts` stay platform-neutral (no DOM, React, Vite or Supabase imports) — a future Expo app reuses them as-is; see `docs/mobile-native.md`.
- Netlify self-deploys are configured only via `netlify.toml` (`NITRO_PRESET=netlify`, publish `dist`); keep `vite.config.ts` preset-free so Lovable hosting stays on its default target.
- Browser Supabase traffic (REST/Auth/Storage) is rewritten to the same-origin relay `/api/public/sb/*` by `src/lib/sb-relay.ts` — `*.supabase.co` is blocked on many Myanmar networks; the relay forwards the caller's own key/token so RLS stays the authority. Realtime (websocket) is not relayed.
- Native Android/iOS apps are a Capacitor shell (`capacitor.config.ts`) loading the published site via `server.url` — the app is SSR and needs the live server + relay; see `docs/capacitor.md`.
