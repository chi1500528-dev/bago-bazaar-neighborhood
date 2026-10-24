import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, LayoutGrid, MapPin, Receipt, Search, ShoppingCart, User } from "lucide-react";
import { Logo } from "./bits";
import { useApp } from "@/lib/app-state";
import { townshipsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useApp();
  return (
    <div className={cn("inline-flex rounded-full border bg-card p-0.5 text-xs", className)} role="group" aria-label="Language">
      {(["my", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn("rounded-full px-2.5 py-1 transition-colors", lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {l === "my" ? "မြန်မာ" : "English"}
        </button>
      ))}
    </div>
  );
}

export function TownshipSelect({ className }: { className?: string }) {
  const { township, setTownship, pick, t } = useApp();
  const { data } = useQuery(townshipsQuery);
  return (
    <label className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
      <MapPin className="size-4 text-primary" />
      <span className="sr-only">{t("nav.township")}</span>
      <select
        value={township ?? ""}
        onChange={(e) => setTownship(e.target.value || null)}
        className="max-w-[9rem] cursor-pointer bg-transparent text-foreground outline-none"
      >
        <option value="">{t("nav.all_townships")}</option>
        {data?.map((tw) => (
          <option key={tw.id} value={tw.id}>{pick(tw.name_my, tw.name_en)}</option>
        ))}
      </select>
    </label>
  );
}

function SearchBox({ className }: { className?: string }) {
  const { t } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } });
      }}
      role="search"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("nav.search_placeholder")}
        aria-label={t("common.search")}
        className="h-11 w-full rounded-full border border-border/80 bg-card pl-10 shadow-soft transition-shadow pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </form>
  );
}

function AccountMenu() {
  const { session, roles, t } = useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  if (!session)
    return (
      <Link to="/auth" className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-accent">
        <User className="size-4" /> <span className="hidden sm:inline">{t("nav.signin")}</span>
      </Link>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-accent">
        <User className="size-4" /> <span className="hidden sm:inline">{t("nav.account")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild><Link to="/account">{t("account.title")}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/orders">{t("orders.title")}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/merchant">{t("nav.merchant")}</Link></DropdownMenuItem>
        {roles.includes("admin") && <DropdownMenuItem asChild><Link to="/admin">{t("nav.admin")}</Link></DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await qc.cancelQueries();
            qc.clear();
            await supabase.auth.signOut();
            navigate({ to: "/auth", replace: true });
          }}
        >
          {t("nav.signout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CartLink() {
  const { cart, t } = useApp();
  const n = cart.reduce((s, l) => s + l.quantity, 0);
  return (
    <Link to="/cart" className="relative inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-accent" aria-label={t("nav.cart")}>
      <ShoppingCart className="size-4" />
      <span className="hidden sm:inline">{t("nav.cart")}</span>
      {n > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-gold-foreground">{n}</span>
      )}
    </Link>
  );
}

export function Header() {
  const { t } = useApp();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-3 md:gap-5">
        <Logo />
        <span className="hidden h-7 w-px bg-border lg:block" />
        <TownshipSelect className="hidden lg:flex" />
        <SearchBox className="hidden flex-1 md:block md:max-w-2xl" />
        <nav className="ml-auto flex items-center gap-1 md:ml-0">
          <Link to="/categories" className="hidden h-9 items-center rounded-md px-3 text-sm font-medium hover:bg-accent lg:inline-flex">
            {t("nav.categories")}
          </Link>
          <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <LangSwitch className="hidden sm:inline-flex" />
          <AccountMenu />
          <span className="hidden md:inline-flex"><CartLink /></span>
        </nav>
      </div>
      <div className="container-page flex items-center gap-2 pb-3 md:hidden">
        <SearchBox className="flex-1" />
        <LangSwitch className="sm:hidden" />
      </div>
    </header>
  );
}

export function BottomNav() {
  const { t, cart } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const n = cart.reduce((s, l) => s + l.quantity, 0);
  const items = [
    { to: "/", label: t("nav.home"), icon: Home, active: path === "/" },
    { to: "/categories", label: t("nav.categories"), icon: LayoutGrid, active: path.startsWith("/categories") || path.startsWith("/c/") },
    { to: "/orders", label: t("nav.orders"), icon: Receipt, active: path.startsWith("/orders") },
    { to: "/cart", label: t("nav.cart"), icon: ShoppingCart, active: path === "/cart" || path === "/checkout", badge: n },
    { to: "/account", label: t("nav.account"), icon: User, active: path.startsWith("/account") || path === "/auth" },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.to}>
            <Link to={it.to} className={cn("relative flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] leading-tight", it.active ? "text-primary" : "text-muted-foreground")}>
              <it.icon className="size-5" strokeWidth={it.active ? 2.4 : 1.8} />
              <span className="line-clamp-1 px-0.5">{it.label}</span>
              {"badge" in it && it.badge > 0 && (
                <span className="absolute right-[22%] top-1 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">{it.badge}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  const { t } = useApp();
  return (
    <footer className="mt-16 bg-primary-deep pb-24 text-primary-foreground md:pb-0 [&_a:hover]:text-gold [&_.text-muted-foreground]:text-primary-foreground/70 [&_.text-foreground]:text-primary-foreground">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{t("footer.tagline")}</p>
          <LangSwitch />
        </div>
        <ul className="space-y-2 text-sm">
          <li><Link to="/about" className="hover:text-gold">{t("footer.about")}</Link></li>
          <li><Link to="/contact" className="hover:text-gold">{t("footer.contact")}</Link></li>
          <li><Link to="/help" className="hover:text-gold">{t("footer.help")}</Link></li>
        </ul>
        <ul className="space-y-2 text-sm">
          <li><Link to="/terms" className="hover:text-gold">{t("footer.terms")}</Link></li>
          <li><Link to="/privacy" className="hover:text-gold">{t("footer.privacy")}</Link></li>
          <li><Link to="/merchant" className="hover:text-gold">{t("footer.merchant")}</Link></li>
        </ul>
      </div>
      <div className="border-t border-primary-foreground/15 py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Bago Market · ပဲခူးဈေး</div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container-page flex-1 pb-24 md:pb-8">{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}

/** Client-side gate for signed-in pages. Data is still protected by database rules. */
export function RequireAuth({ role, children }: { role?: "admin"; children: ReactNode }) {
  const { session, authReady, roles, t } = useApp();
  const { data: rolesLoaded } = useQuery({ queryKey: ["roles", session?.user.id], enabled: false });
  if (!authReady) return <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!session)
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="mb-4 text-muted-foreground">{t("auth.required")}</p>
        <Link to="/auth" className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">{t("nav.signin")}</Link>
      </div>
    );
  if (role && !roles.includes(role))
    return <p className="py-16 text-center text-sm text-muted-foreground">{rolesLoaded === undefined ? t("common.loading") : t("auth.forbidden")}</p>;
  return <>{children}</>;
}
