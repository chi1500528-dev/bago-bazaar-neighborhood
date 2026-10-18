// Browser-only: send Supabase calls through our own site (/api/public/sb)
// so the app works where *.supabase.co is blocked. Call once on the client.
const SB = String(import.meta.env['VITE_SUPABASE_URL'] ?? "").replace(/\/+$/, "");

export function toRelayUrl(url: string): string {
  if (typeof window === "undefined" || !SB || !url.startsWith(SB + "/")) return url;
  return `${window.location.origin}/api/public/sb${url.slice(SB.length)}`;
}

let installed = false;
export function installSupabaseRelay() {
  if (installed || typeof window === "undefined" || !SB) return;
  installed = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === "string") return orig(toRelayUrl(input), init);
    if (input instanceof URL) return orig(toRelayUrl(input.href), init);
    if (input instanceof Request && input.url.startsWith(SB + "/")) {
      return orig(new Request(toRelayUrl(input.url), input), init);
    }
    return orig(input, init);
  };
}
