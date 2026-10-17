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
