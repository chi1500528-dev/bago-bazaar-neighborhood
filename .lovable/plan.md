# Bago Market: approved network connectivity investigation

## Summary and recommendation

The strongest evidence points to a network-path problem, not a broken database. The precise cause is not yet proven: company filtering, DNS, TLS inspection, routing, and browser extensions remain possibilities.

**First choice:** ask company IT to approve and allow the existing Supabase API hostname over HTTPS, including the WebSocket connection used for live orders. This preserves everything and requires no application migration or additional Supabase subscription.

**Second choice:** a Supabase-managed custom API domain, only if IT explicitly approves the domain, its CNAME destination, and underlying infrastructure. It changes the address, not the destination network; it cannot reliably solve IP, upstream, or CNAME-aware blocking.

No application code, database, environment variables, hosting, or Supabase settings were changed. Only this investigation and approval document was created.

## Evidence collected on 18 October 2026

- Preview telemetry at **09:44:40 UTC** shows `Failed to fetch` for six requests to the same Supabase hostname: `user_roles`, `townships`, `categories`, `promotions`, `shops`, and `products`. No HTTP response status was recorded for those failures.
- From the sandbox, outside the company network, a public categories request returned **HTTP 200** with valid TLS and an `Access-Control-Allow-Origin` response matching the preview origin.
- A browser-style OPTIONS preflight for the same API returned **HTTP 200**, allowing the requested headers and methods.
- The Auth health endpoint returned **HTTP 200** with the publishable API key. Without a key it returned **401**, an expected reachable-service response—not evidence of an outage.
- Read-only database queries succeeded. Public catalog SELECT policies exist; profiles and orders are identity/ownership restricted. Admin decisions use the separate `user_roles` table and database `has_role` checks. These checks do not establish every write permission or hosted Auth setting.
- The `orders` table is in the `supabase_realtime` publication.
- The company network itself was not accessible for testing. VPN success is user-reported. Login, uploads, checkout, and WebSocket connectivity were not exercised from that network; their failure modes below are source-based predictions.

## Technical audit: hosts, endpoints, and configuration

### Active backend hostname

`rvgqgtjkqmvjauqofsgt.supabase.co`

HTTPS origin: `https://rvgqgtjkqmvjauqofsgt.supabase.co` (port 443).
Realtime uses the same hostname over WSS (port 443).

| Dependency | Endpoint paths under that origin | Use |
|---|---|---|
| Database REST | `/rest/v1/{table}` | Tables: `townships`, `categories`, `shops`, `products`, `promotions`, `profiles`, `user_roles`, `orders`; order detail embeds `order_items` and `order_status_history` |
| Order functions | `/rest/v1/rpc/place_order`, `/rest/v1/rpc/update_order_status` | Create orders, calculate authoritative prices, decrement/restore stock, validate status transitions |
| Auth | `/auth/v1/token?grant_type=password`, `/auth/v1/token?grant_type=refresh_token`, `/auth/v1/signup`, `/auth/v1/logout` | Email/password login, refresh, signup, logout; SDK may also use `/auth/v1/user` and `/auth/v1/verify` for user/confirmation flows |
| Private media upload | `/storage/v1/object/media/{userId}/{filename}` | Merchant/admin uploads; paths, not generated signed URLs, are stored in the database |
| Signed media | `/storage/v1/object/sign/media/{path}` | POST to obtain a signed URL, then GET to display the image; signed URLs are temporary credentials and must be redacted |
| Realtime | `wss://rvgqgtjkqmvjauqofsgt.supabase.co/realtime/v1/websocket` | Customer order UPDATE events and merchant shop-order events; SDK adds query parameters |
| Edge Functions | SDK supports `/functions/v1/{name}` | No app invocation or function source was found; deployed-but-unused functions were not inventoried through management access |

The frontend currently connects **directly from the browser** using Supabase + React Query. Hosting the frontend on Netlify does not move these requests to Netlify.

Configuration names inspected without revealing private values:

- Browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- Server/local and Netlify configuration: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` where present.
- Generated privileged helper references `SUPABASE_SERVICE_ROLE_KEY`; it is not an active browser dependency. Other provisioned Supabase/managed secrets are not necessary for browser catalog requests.
- `netlify.toml` repeats the public connection configuration. `vite.config.ts` contains no alternative API domain. `supabase/config.toml` contains the existing project identifier only.
- The installed client handles opaque publishable keys by sending `apikey` and removing an invalid key-as-bearer header. No evidence suggests that opaque-key formatting caused the observed network failures.

Other hosts: the preview frontend is on `id-preview--6e6eef8d-326f-46b0-8e8e-90972e48629a.lovable.app`; Google Fonts uses `fonts.googleapis.com` and `fonts.gstatic.com`. Editor session sharing uses trusted Lovable origins only in framed previews. These are separate from database connectivity. Full URL image values can point to other hosts if present in data; those data-dependent hosts were not enumerated.

### Source inventory

- Client/configuration: `src/integrations/supabase/client.ts:11–74`; generated server helpers: `auth-middleware.ts:34–109`, `client.server.ts:32–68`. No active `createServerFn`, custom server API route, or `functions.invoke` call was found.
- Session/roles/profile preferences: `src/lib/app-state.tsx:53–105`; Auth: `src/routes/auth.tsx:36–49`; sign-out: `src/components/site/shell.tsx:103`; account: `src/routes/account.tsx:29–38`.
- Shared catalog/cart-shop reads: `src/lib/queries.ts:9–55`; home: `src/routes/index.tsx:45–72`; browsing: `src/components/site/browser.tsx:29–49`; `src/routes/search.tsx:42`, `c.$slug.tsx:37`, `shops.$slug.tsx:31–40`, `p.$id.tsx:35`.
- Checkout: `src/routes/checkout.tsx:49–87`; order list: `src/routes/orders.index.tsx:26`; detail/status/realtime: `src/components/site/order-detail.tsx:16–44`.
- Merchant shop/product/order reads and writes: `src/routes/merchant.tsx:42,104–105,149,201–202,240–250`.
- Admin counts, shops, products, orders, categories, promotions: `src/routes/admin.tsx:67,97,105,145,156,169,203,216,264,276,281`.
- Storage: `src/lib/media.ts:6–24`; display: `src/components/site/bits.tsx:37–47`. Native integration guidance: `docs/mobile-native.md:32–38`.

## What fails when Supabase is unreachable

| Surface | Current behavior / risk |
|---|---|
| Website frame, bundled imagery, local language/cart | Can still load; this explains a healthy-looking website with broken data |
| Featured shops, products, search | Main queries throw errors and some views offer a generic retry |
| Categories, promotions, food/nearby sections | Home/category-index category lists offer retry; other category lookups can resemble no results. Promotions and food/nearby sections can show empty-state messages instead of explaining connection errors |
| Roles | The role query ignores returned errors and defaults to `[]`; Admin access can appear to disappear, without deleting the actual role |
| Login/signup/token refresh | Cannot complete online; a cached session may remain temporarily, but is not proof of reachable Auth or valid server access |
| Profile loading / language saving | Some returned errors are ignored; forms may stay blank or language persistence may silently fail |
| Cart-shop / checkout | Cart-shop read ignores errors; checkout can keep showing “loading” when no shop data arrives |
| Place order | Reports a generic error and keeps the cart if no successful response arrives. If the request committed but its response was lost, the outcome is uncertain; reuse the same idempotency key and reconcile the order before retrying |
| Order detail | A failed read can look like “forbidden” rather than a connectivity problem |
| Merchant / admin | Failed reads can appear as no shop, no orders/products, or zero counts. Some toggle/delete actions ignore returned errors |
| Uploaded photos | Signing failures become placeholders. Already cached signed images may display until expiry/cache loss; uploads fail |
| Live order updates | Both subscriptions clean up correctly, but subscription failures are not surfaced; status can become stale without a warning |

Storage policy observation: `media` is a private bucket, but its SELECT policy allows reading/signing objects in that bucket; writes are user-folder restricted. “Private” does not mean every image is owner-only. Preserve existing policy behavior; any privacy review would be a separate task.

## Distinguishing possible causes

- **Network blocking / routing:** most likely category because unrelated public and signed-in requests fail together and VPN changes the result. Request company gateway/proxy denial logs.
- **DNS:** company DNS may fail, rewrite the answer, or block the hostname. IT should compare company DNS resolution with their approved reference resolver; do not switch DNS to bypass policy.
- **TLS inspection / firewall:** a company proxy may reject the certificate chain, destination, headers, or WebSocket upgrade. Check certificate issuer, TCP/TLS results, and filtering logs.
- **CORS:** browser `Failed to fetch` can mean CORS. The origin and preflight passed outside the company network, making a global CORS misconfiguration less likely. A corporate gateway can alter the responses, so check the actual browser console and OPTIONS response there.
- **Configuration:** the inspected browser/Netlify settings use the same existing project. Independently deployed Netlify settings and redirect allowlists remain unverified. A wrong deployment usually fails on VPN too.
- **Authentication / permissions:** reachable services ordinarily return HTTP/API errors or RLS-filtered rows. They do not explain concurrent transport failures for public categories and townships. Expired tokens can be a secondary consequence of unreachable refresh endpoints.
- **Browser extensions / device security:** reproduce in an IT-approved clean browser profile on the same network to separate local filtering from network filtering.

## Options and compatibility

### A. Approve the existing Supabase hostname — recommended first

IT allows the exact hostname, HTTPS requests and required WSS traffic, in accordance with company policy. No data, account, permission, storage, or native-app changes. No extra Supabase domain fee; internal IT effort remains. Prefer hostname-based rules over a fixed CDN IP list.

### B. Supabase-managed custom API domain

Keep the same project, database, account IDs/passwords, RLS, order functions, private bucket, and Realtime publication. The SDK derives Auth, Storage and Realtime URLs from the configured base URL. Verify WSS and signed-image hosts before rollout. Browser session storage naming may change with the hostname, so plan a possible one-time sign-in—not account recreation.

Update browser build settings, any active server settings, Netlify configuration, and future Android/iOS client URLs only after approval. Refresh signed URLs rather than rewriting stored object paths. Review email links and redirect URLs; if OAuth/SAML is added or already configured outside the source, review callbacks/issuer settings before activation. The original project domain stays usable, but Auth activation has side effects, so rollback must include Auth configuration.

Requires a domain you control and a paid Supabase plan. Official published add-on rate: **$0.0137/hour, approximately $10/month**. Pro starts at **$25/month**; a baseline single Micro project plus domain is approximately **$35/month**, excluding taxes, domain registration, extra usage and other projects. Existing plan/billing has not been checked. Confirm the current quote before purchase.

A custom domain is a CNAME to Supabase, not a different network location. Use only with explicit IT approval; do not buy it assuming it will bypass an IP or vendor block.

### C. An approved HTTPS application backend on accessible infrastructure

Only if IT permits that infrastructure to communicate with the existing Supabase project. Keep data/accounts in place, but move browser operations behind explicitly designed authenticated application endpoints—not a blind forwarding proxy.

The backend must validate user tokens and preserve user-scoped RLS and existing order RPCs. Do not use a service-role key for ordinary customer/merchant reads or writes. Login, refresh, logout, uploads and image delivery must also use approved paths; moving only catalog reads leaves the problem unresolved. Returning original Supabase signed-image URLs still requires browser access to Supabase.

Realtime needs an approved authenticated live-update channel or a deliberately approved polling alternative; a generic HTTPS backend does not automatically preserve the current subscriptions. Native clients can use the new API but require a contract and Auth changes. Adds hosting, monitoring, security review and substantial engineering cost while retaining Supabase costs. If company policy disallows Supabase itself, this is not an acceptable workaround.

### D. Self-hosted Supabase — last resort

Useful only if company policy requires approved infrastructure or managed Supabase remains inaccessible. Compatible services exist for Postgres, Auth, Storage and Realtime, but this is a real migration, not a URL-only change.

Preserve account UUIDs/password hashes and database policies/functions/triggers through a tested supported backup/restore. Configure new JWT/API keys, SMTP and Auth settings; existing managed-project tokens will not remain valid and users must sign in again. Copy storage objects separately and preserve paths/policies; restore Realtime publication/configuration and test events. Future native clients change URLs/keys and reauthenticate.

Supabase documents minimum full-stack resources of 4 GB RAM, 2 cores and 40 GB SSD, with higher recommendations. Hosting price depends on provider; backups, patching, uptime, TLS and disaster recovery become your responsibility. Highest operational disruption and generally not the most cost-effective choice for this app.

## Approval-gated implementation sequence

1. **Company-network diagnosis, with IT:** reproduce without VPN on the same device/browser; record DNS, TLS, request status, CORS/OPTIONS and WSS results with UTC timestamps. Export only redacted evidence—remove authorization headers, API keys, cookies, personal data and signed-URL tokens.
2. **Obtain the policy decision:** ask IT whether the existing hostname may be allowed. If yes, IT applies its approved network rule; no app changes are needed.
3. **Retest all services without VPN:** public catalog; login/signup confirmation and refresh; own profile; admin role visibility; merchant shop/products; private-photo upload and display; customer/merchant order visibility; order status and Realtime reconnection. Use agreed test accounts and get permission before creating test orders or changing stock.
4. **If allowlisting is denied:** obtain written approval of a managed custom domain and its underlying destination, plus your approval of the subscription cost and selected domain, before provisioning anything.
5. **Custom-domain rollout, if approved:** document current settings and rollback; configure domain/DNS/TLS; check callbacks and session implications; validate REST/Auth/Storage/WSS; change the client and deployment URLs consistently; deploy and repeat step 3 on the company network and ordinary mobile networks.
6. **If the underlying infrastructure is disallowed:** return with a separately scoped, priced plan for an approved application backend or self-hosted migration. No migration, data export, proxy, server implementation, or domain purchase is authorized by this audit.

**Approval scope:** proceeding with this plan authorizes diagnosis and coordination only. Configuration/code changes, deployment, paid services, and test data writes require the specific approval described above. Company IT approval cannot be replaced by approval in this chat.

## Official references

- Custom domains, CNAME requirement and Auth activation: https://supabase.com/docs/guides/platform/custom-domains
- Domain add-on pricing: https://supabase.com/docs/guides/platform/manage-your-usage/custom-domains
- Plan pricing: https://supabase.com/pricing
- SDK custom-domain initialization: https://supabase.com/docs/reference/javascript/initializing
- Self-hosting responsibilities: https://supabase.com/docs/guides/self-hosting
- Supported restore, accounts, tokens and separate object transfer: https://supabase.com/docs/guides/self-hosting/restore-from-platform
- Docker resource requirements: https://supabase.com/docs/guides/self-hosting/docker