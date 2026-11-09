# Deploy to Cloudflare (Bangkok / Singapore edge)

The default build (no `NITRO_PRESET`) already targets Cloudflare Workers and writes
`dist/server/wrangler.json` (server) + `dist/client` (static files).

## 1. Create the Worker from GitHub
Cloudflare Dashboard → Workers & Pages → Create → Import a repository → pick the repo.
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`
- Do NOT set `NITRO_PRESET` (that is Netlify-only, set in `netlify.toml`).

## 2. Variables (Worker → Settings → Variables and Secrets)
Build variables AND runtime variables:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
Runtime secret (for account deletion): `SUPABASE_SERVICE_ROLE_KEY`.
Settings → Compatibility flags: add `nodejs_compat`.

## 3. Domain
1. Cloudflare → Add a domain → `bagomarket.shop` (Free plan) → copy its 2 nameservers.
2. Z.com → Custom Nameservers → replace Netlify's four with Cloudflare's two.
3. Re-add the Resend DNS records (DKIM TXT, SPF TXT, MX, DMARC TXT) in Cloudflare DNS
   — they are NOT copied from Netlify automatically. Without them email codes stop.
4. Worker → Settings → Domains & Routes → add `bagomarket.shop` and `www.bagomarket.shop`.
5. Network → turn HTTP/3 (QUIC) OFF. SSL/TLS → Full (strict).

## 4. After it works
Remove the domain from Netlify. Supabase Site URL stays `https://bagomarket.shop`.
