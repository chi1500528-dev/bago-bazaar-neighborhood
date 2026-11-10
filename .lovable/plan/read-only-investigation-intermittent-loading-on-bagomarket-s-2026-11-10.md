# Read-only investigation: intermittent loading on bagomarket.shop

Nothing was edited, deployed or changed. Every probe below ran from Lovable's test server, whose traffic reached Cloudflare's Paris edge (`cf-ray ...-CDG`). These probes **cannot reproduce a Myanmar mobile ISP path**. They show only how the site behaves on a clean network.

## Evidence table (direct observations, Nov 10 2026 ~19:00 UTC)

| Check | bagomarket.shop | www.bagomarket.shop | workers.dev |
|---|---|---|---|
| DNS A | 188.114.96.2, 188.114.97.2 | same | same |
| DNS AAAA | 2a06:98c1:3120::2 / 3121::2 | same | same |
| DNS HTTPS record | `alpn="h2"`, ech present | `alpn="h2"`, ech present | `alpn="h3,h2"`, ech present |
| Root HTML x3 | 200, 45,959 B, 0.70–0.88 s | 200, 45,959 B, 0.49–0.67 s | 200, 45,959 B, 0.33–0.56 s |
| Protocol / connected IP | HTTP/2 over IPv6 | HTTP/2 over IPv6 | HTTP/2 over IPv6 |
| `alt-svc` header | none | none | `h3=":443"; ma=86400` |
| http:// → | 1 redirect to https, 200 | 1 redirect to https, 200 | no redirect, plain http 200 |
| HTML compressed (br) | 10.8 KB on the wire | – | – |
| HTML cache | not edge-cached (built fresh by the Worker on every request) | same | same |
| 30 JS/CSS/image assets x2 | 60/60 = 200, max 0.14 s | 60/60 = 200, max 0.18 s | 60/60 = 200, max 0.19 s |
| Asset cache | `cf-cache-status: HIT`, `max-age=31536000, immutable` | same | same |
| Asset file names | identical on all three hosts (same build) | | |
| Relay, no key, x3 | 401 "No API key found", 0.08–0.25 s | 401, 0.09–0.20 s | 401, 0.09–0.11 s |
| Relay with the public app key, x3 | 200 `[{"id":"376b…"}]`, 0.21–0.49 s | not repeated | 200, 0.23–0.26 s |

Third-party origins in the HTML: only Google Fonts (`fonts.googleapis.com` stylesheet, plus a `fonts.gstatic.com` preconnect). All JS, CSS, images and database calls are same-origin, and there are no `supabase.co` references in the HTML.

Home page weight: about 2 MB on the wire. That is roughly 10 KB of HTML, roughly 140 KB of main JS, and about 1.4 MB of bundled JPEGs (hero 292 KB, category photos 130–218 KB each). Shop and product photos load later, one signed-link request per picture through the relay.

## About the "No API key found" relay result
- **Expected.** The relay forwards only the headers the caller sends. A bare curl sends no `apikey`, so Supabase returns 401 for the request. The real app always attaches the public key.
- **What it proves:** the relay route is live on all three hosts, it reaches Supabase, and Supabase answers quickly.
- **What it doesn't prove:** that the data path works. The keyed probe above does prove that, returning 200 with real data on apex and workers.dev. Neither probe says anything about the path from a Myanmar phone.

## Code paths that could leave a page looking stuck (from reading the code)
1. **Google Fonts stylesheet blocks rendering.** It is a normal `<link rel="stylesheet">` in `__root.tsx`, so the browser waits for it before drawing the page. If `fonts.googleapis.com` stalls on a phone's network, the page can stay blank or half-drawn until the browser gives up. This applies to all three hosts equally.
2. **Startup sign-in check.** `AppProvider` calls `supabase.auth.getSession()` on load. With a stored session it may refresh the token through `/api/public/sb/auth/v1/token`. If that request hangs, `authReady` stays false and sign-in-dependent parts wait. The catalog is already in the HTML.
3. **The page appears before it works.** The server sends finished HTML with products, then the browser downloads about 30 files and makes the page interactive. If the connection drops part-way, the products show but taps do nothing. To a user that looks like "stopped in the middle".
4. **Many small relay requests after load:** one signed-URL request per picture, plus notification polling every 8 s (`refetchIntervalInBackground: true`) and chat polling. Each one is a new chance to fail on an unstable link. This can explain missing pictures, but not a blank page.
5. **No service worker,** so a repeat visit can't fall back to a cached page.

## Hypotheses (not supported or ruled out by these probes)
- The probes show **no difference** between apex, www and workers.dev from outside Myanmar. They share the same IPs, files and timings, and all three get cache HITs. If the difference is real, it sits on the phone → Cloudflare path (domain-name-based filtering, or IPv6 vs IPv4 routing). Nothing here confirms either.
- An ISP reset, a bot challenge, Rocket Loader or a Cloudflare security setting are **not** supported by any output here. No challenge page, no `cf-mitigated` header and no non-200 asset showed up.
- One small real difference: workers.dev still advertises HTTP/3, while the custom domains do not.
- All three hosts resolve to IPv6, and these probes connected over IPv6. A carrier with broken IPv6 routing could cause intermittent hangs on any host. This is unverified.

## Most useful next diagnostic on a failing phone
Capture what the phone itself sees, without changing any settings:
1. Android Chrome: open `chrome://net-export` and start logging. Load `https://bagomarket.shop` until it stalls, then load the workers.dev link, then stop logging and share the JSON file. It records the DNS answer, the IP family used (v4 or v6), the TLS outcome and the exact failing request.
2. If that's too heavy, connect the phone by USB to a PC with Chrome and open `chrome://inspect` → Network tab. Note which request stays "pending" or fails (HTML, a `/assets/` file, `fonts.googleapis.com`, or `/api/public/sb/...`) and its error code.

The single failing request named in that capture decides the next fix (fonts, relay, IPv6 or the domain itself). Code changes would be a separate plan.
