# Milestone 1 audit (commit 0b0e592) — read-only findings

No code, database or settings were changed. Checks were made against the Supabase project this preview uses (rvgqgtjkqmvjauqofsgt), using the database linter, the security scan, read-only queries, and a code review.

## 1. The 12 Supabase security warnings (all level: WARN)

None of the 12 points at anything this commit added. This commit's migrations create no SECURITY DEFINER functions. They change only `products_validate`, which is not SECURITY DEFINER. Every function below already existed before this commit (it appears in earlier migrations). From the data I have, I can't prove the exact date each warning first appeared.

| #   | Warning                               | Affected                                | Concrete risk                                                                                                       | Safe next step                                                                                                 |
| --- | ------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | Public can run SECURITY DEFINER fn    | `has_role(user, role)` (anon)           | Anyone signed out can ask "is user X an admin?" if they know the user's ID. This leaks who holds which role.        | Revoke anon. Look at a version that checks only `auth.uid()` for the caller. Test RLS afterwards.              |
| 2   | Public can run SECURITY DEFINER fn    | `media_is_public(path)` (anon)          | Signed-out people can check whether a file path is published. Low risk, because the result matches the read policy. | Keep it (the storage read policy needs it). Write down why.                                                    |
| 3   | Public can run SECURITY DEFINER fn    | `shop_is_public(shop)` (anon)           | Shows whether a shop is approved and active. That is already public information. Low risk.                          | Keep it (product read policy). Write down why.                                                                 |
| 4   | Signed-in can run SECURITY DEFINER fn | `can_access_conversation(id)`           | Tells a signed-in user only about themselves. Low risk.                                                             | Keep it. Write down why.                                                                                       |
| 5   | same                                  | `can_view_order(id)`                    | Same as #4. Low risk.                                                                                               | Keep it. Write down why.                                                                                       |
| 6   | same                                  | `has_role(user, role)` (authenticated)  | Any signed-in user can look up any other user's roles (for example, find the admins). Medium risk.                  | Same fix as #1.                                                                                                |
| 7   | same                                  | `is_shop_owner(shop)`                   | Only answers about the caller. Low risk.                                                                            | Keep it. Write down why.                                                                                       |
| 8   | same                                  | `media_is_public(path)` (authenticated) | Same as #2.                                                                                                         | Same as #2.                                                                                                    |
| 9   | same                                  | `place_order(...)`                      | Customers are meant to call it. It checks the shop, stock and prices on the server.                                 | Keep it. Write down why.                                                                                       |
| 10  | same                                  | `shop_is_public(shop)` (authenticated)  | Same as #3.                                                                                                         | Same as #3.                                                                                                    |
| 11  | same                                  | `update_order_status(...)`              | Meant to be called. It checks owner, admin or customer and the allowed status steps.                                | Keep it. Write down why.                                                                                       |
| 12  | Leaked password protection off        | Supabase Auth setting                   | People can choose passwords that have already leaked.                                                               | Supabase offers this only on its Pro plan. Until then, the 8-character + 1-number rule is the only protection. |

The one real fix is `has_role` (#1 and #6). Every other function is used by access rules or the app on purpose.

## 2. Are the Milestone 1 migrations applied?

Yes, confirmed in the preview's database:

- The migration list includes `20261117163758` and `20261117164045`.
- `products.sku` and `products.barcode` exist.
- Unique indexes `products_shop_sku_uniq` (not case-sensitive) and `products_shop_barcode_uniq` exist.
- The `product_imports` and `product_templates` tables exist with their access rules. `product_templates` has 0 rows, so nothing was seeded.

## 3. Suspected CSV issues

| Issue                                                              | Result        | Evidence                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Re-import preview/update leaves out changed SKU, barcode, category | **Confirmed** | `analyzeRows` compares only name, price, sale_price, stock and description. Category is never compared or updated. SKU and barcode are only used to find the match, so a changed SKU or barcode can't be offered. |
| Empty CSV cell can't clear an existing sale price or description   | **Confirmed** | `cmp` skips any change where the new value is `""`. Because an empty cell is ignored, nothing can be cleared (this may be on purpose, but the owner isn't told).                                                  |
| Category-creation errors ignored                                   | **Confirmed** | `ensureCategories` never reads `error`. A failed category quietly becomes "no category".                                                                                                                          |
| Some rows fail, but it still shows success and closes              | **Confirmed** | It always shows the success message, saves the history entry and calls `onDone()`. A failure shows only a vague "something went wrong". The `product_imports` insert error is also ignored.                       |
| Product-code check has no paging                                   | **Confirmed** | `useExisting` selects every product with no range. Supabase returns at most 1000 rows, so shops with more than 1000 products miss matches.                                                                        |
| Correction screen edits only some fields                           | **Confirmed** | Validation errors show only name, price, sale_price and stock. Code conflicts show only SKU and barcode. Category and description can never be edited.                                                            |

## 4. Other high-impact issues found

1. **One bad row rejects 100 good rows (data loss).** New rows are inserted 100 at a time. If one row breaks a database rule, the whole group of 100 fails and is only counted as "failed". Example: an SKU that clashes only by upper/lower case or trailing spaces, or a product past the 1000-row limit.
2. **SKU matching differs from the database.** The database ignores upper/lower case and trims spaces on SKU, and trims spaces on barcode. The browser trims each cell, but its barcode duplicate check is case-sensitive. Mismatches show up as save errors instead of a clear row message.
3. **Import history can be wrong.** It records `added`/`updated` even when rows failed, and doesn't record failed counts.
4. **Changes save one row at a time with no undo.** If an import stops halfway (common on slow mobile networks), some products are updated and some are not, and the owner isn't told which.
5. **Access rules are fine.** Product, import and template rules limit writes to the shop owner or an admin. No authorization gap was found in Milestone 1.
6. **Not checked here:** the single-product form and search on a real phone (I can't sign in on this external Supabase).

## Suggested next step (needs your approval)

A small "CSV import safety" fix:

- compare and update SKU, barcode and category
- an optional "clear empty cells" choice
- show category and history errors
- a clear result screen that lists failed rows and stays open
- read existing products in pages of 1000
- insert row by row (or retry one row at a time) so one bad row doesn't sink the others
- matching rules the same as the database
- all fields editable in the correction screen
- a separate small change to stop users looking up other users' roles through `has_role`
