# Remove green from home banner + fix security warnings

## 1. Home banner without green
- Remove the green shade laid over the banner photo so the photo shows in its natural colours.
- To keep the white heading readable, replace it with a soft, neutral dark shade only behind the text side (light charcoal, not green), fading to fully clear over the products in the photo.
- Keep the photo, heading, gold label line and "Shop" button exactly as they are.

## 2. Fix the security warnings (no change in how the app looks or works)
- Stop ordinary visitors from triggering internal database actions directly; only the app's own safe paths (placing an order, updating order status, chat, etc.) can still run them.
- Turn on the check that blocks leaked/weak passwords at sign-up.
- Re-run the security check and confirm the warnings are gone; anything that cannot be safely closed will be explained plainly.

## Technical details
- `src/routes/index.tsx`: replace `from-primary/...` gradient overlay with `from-foreground/70 via-foreground/30 to-transparent` style neutral gradient (token based, no hardcoded colours).
- Migration: `REVOKE EXECUTE ... FROM anon, public` on internal SECURITY DEFINER functions flagged by the scan (trigger/helper functions), keeping `authenticated` grants only for `place_order`, `update_order_status`, `has_role`, `media_is_public` and other functions the app calls; verify against client calls with `rg "rpc("`.
- Enable leaked password protection via auth settings.
- Re-run security scan and mark fixed findings.
