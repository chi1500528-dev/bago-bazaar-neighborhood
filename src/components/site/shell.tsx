import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Heart,
  Home,
  LayoutGrid,
  MapPin,
  Receipt,
  Search,
  ShoppingCart,
  Store,
  User,
  X,
} from "lucide-react";
import { Logo } from "./bits";
import { useApp } from "@/lib/app-state";
import { townshipsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playChime, setSoundOn, soundOn, useUnreadCounts } from "@/lib/notify";

function Dot({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold tabular-nums text-gold-foreground">
      {n}
    </span>
  );
}

function SoundToggle() {
  const { t } = useApp();
  const [on, setOn] = useState(true);
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        const v = !soundOn();
        setSoundOn(v);
        setOn(v);
        if (v) playChime();
      }}
      onFocus={() => setOn(soundOn())}
    >
      {on ? "🔔 " + t("notify.sound_on") : "🔕 " + t("notify.sound_off")}
    </DropdownMenuItem>
  );
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LangSwitch({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const { lang, setLang, t } = useApp();
  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-xl border p-0.5 text-xs font-medium",
        onDark ? "border-primary-foreground/25 bg-primary-foreground/10" : "bg-card",
        className,
      )}
      role="group"
      aria-label={t("account.language")}
    >
      {(["my", "en"] as const).map((l) => (
        <Button
          variant="ghost"
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "h-11 rounded-xl px-2 py-1 text-xs transition-colors",
            onDark
              ? lang === l
                ? "bg-primary-foreground text-primary"
                : "text-primary-foreground/85 hover:text-primary-foreground"
              : lang === l
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:text-foreground",
          )}
        >
          {t(l === "my" ? "language.my" : "language.en")}
        </Button>
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
          <option key={tw.id} value={tw.id}>
            {pick(tw.name_my, tw.name_en)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchBox({ className, autoFocus = false }: { className?: string; autoFocus?: boolean }) {
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
      <Input
        type="search"
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("nav.search_placeholder")}
        aria-label={t("common.search")}
        className="h-11 min-w-0 w-full rounded-xl border border-hairline bg-surface pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </form>
  );
}

function AccountMenu() {
  const { session, roles, t } = useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const counts = useUnreadCounts();
  const total = counts.messages + counts.shopMessages + counts.newOrders;
  if (!session)
    return (
      <Link
        to="/auth"
        className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium hover:bg-accent"
      >
        <User className="size-4" /> <span className="hidden sm:inline">{t("nav.signin")}</span>
      </Link>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium hover:bg-accent">
        <User className="size-4" /> <span className="hidden sm:inline">{t("nav.account")}</span>
        {total > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold tabular-nums text-gold-foreground">
            {total}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link to="/account">{t("account.title")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/orders">{t("orders.title")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/messages">
            {t("chat.title")}
            <Dot n={counts.messages} />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/merchant" search={{}}>
            {t("nav.merchant")}
            <Dot n={counts.shopMessages + counts.newOrders} />
          </Link>
        </DropdownMenuItem>
        <SoundToggle />
        {roles.includes("admin") && (
          <DropdownMenuItem asChild>
            <Link to="/admin">{t("nav.admin")}</Link>
          </DropdownMenuItem>
        )}
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
    <Link
      to="/cart"
      className="relative inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium hover:bg-accent"
      aria-label={t("nav.cart")}
    >
      <ShoppingCart className="size-4" />
      <span className="hidden sm:inline">{t("nav.cart")}</span>
      {n > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold tabular-nums text-gold-foreground">
          {n}
        </span>
      )}
    </Link>
  );
}

function MyShopLink() {
  const { roles, t } = useApp();
  const c = useUnreadCounts();
  if (!roles.includes("merchant")) return null;
  const n = c.shopMessages + c.newOrders;
  return (
    <Link
      to="/merchant"
      search={{}}
      className="relative hidden h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:inline-flex"
    >
      <Store className="size-4" />
      {t("nav.my_shop")}
      {n > 0 && (
        <span className="grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold tabular-nums text-gold-foreground">
          {n}
        </span>
      )}
    </Link>
  );
}

export function Header() {
  const { t } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header
      className="sticky top-0 z-40 border-b border-border/70 bg-surface/95 backdrop-blur-md"
      style={{ paddingTop: "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))" }}
    >
      <div className="container-page flex h-16 min-w-0 items-center gap-2 sm:gap-3 md:gap-5">
        <div className={cn("shrink-0", searchOpen && "hidden md:block")}>
          <div className="sm:hidden">
            <Logo compact />
          </div>
          <div className="hidden sm:block">
            <Logo />
          </div>
        </div>
        <SearchBox className="hidden min-w-0 flex-1 md:block md:max-w-2xl" />
        {searchOpen && (
          <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
            <SearchBox className="min-w-0 flex-1" autoFocus />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(false)}
              aria-label={t("common.cancel")}
            >
              <X />
            </Button>
          </div>
        )}
        <span className="hidden items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary xl:inline-flex">
          <MapPin className="size-3.5" />
          {t("nav.bago_city")}
        </span>
        <nav
          className={cn(
            "ml-auto flex shrink-0 items-center gap-1 md:ml-0",
            searchOpen && "hidden md:flex",
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            title={t("common.search")}
            aria-label={t("common.search")}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(true)}
          >
            <Search />
          </Button>
          <Link
            to="/categories"
            className="hidden h-11 items-center rounded-xl px-3 text-sm font-medium hover:bg-accent lg:inline-flex"
          >
            {t("nav.categories")}
          </Link>
          <MyShopLink />
          <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <LangSwitch />
          <Link
            to="/wishlist"
            aria-label={t("wish.title")}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium hover:bg-accent"
          >
            <Heart className="size-4" />
            <span className="hidden lg:inline">{t("wish.title")}</span>
          </Link>
          <span className="hidden md:inline-flex">
            <AccountMenu />
          </span>
          <span className="hidden md:inline-flex">
            <CartLink />
          </span>
        </nav>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { t, cart, roles } = useApp();
  const isOwner = roles.includes("merchant");
  const path = useRouterState({ select: (s) => s.location.pathname });
  const n = cart.reduce((s, l) => s + l.quantity, 0);
  const c = useUnreadCounts();
  const alerts = c.messages + c.shopMessages + c.newOrders;
  const items = [
    { to: "/", label: t("nav.home"), icon: Home, active: path === "/" },
    {
      to: "/categories",
      label: t("nav.categories"),
      icon: LayoutGrid,
      active: path.startsWith("/categories") || path.startsWith("/c/"),
    },
    isOwner
      ? {
          to: "/merchant",
          label: t("nav.my_shop"),
          icon: Store,
          active: path.startsWith("/merchant"),
          badge: c.shopMessages + c.newOrders,
        }
      : {
          to: "/orders",
          label: t("nav.orders"),
          icon: Receipt,
          active: path.startsWith("/orders"),
          badge: 0,
        },
    {
      to: "/cart",
      label: t("nav.cart"),
      icon: ShoppingCart,
      active: path === "/cart" || path === "/checkout",
      badge: n,
    },
    {
      to: "/account",
      label: t("nav.account"),
      icon: User,
      active: path.startsWith("/account") || path === "/auth",
      badge: isOwner ? c.messages : alerts,
    },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card md:hidden"
      style={{
        paddingBottom:
          "max(0.5rem, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.to}>
            <Link
              to={it.to}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center gap-0.5 py-0.5 text-xs leading-[18px]",
                it.active ? "font-semibold text-primary" : "font-medium text-foreground/70",
              )}
            >
              <it.icon className="size-[22px]" strokeWidth={it.active ? 2.4 : 2} />
              <span className="line-clamp-2 max-w-full px-0.5 text-center">{it.label}</span>
              {"badge" in it && (it.badge ?? 0) > 0 && (
                <span className="absolute right-[22%] top-1 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold tabular-nums text-gold-foreground">
                  {it.badge}
                </span>
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
    <footer className="mt-16 bg-primary pb-24 text-primary-foreground md:pb-0 [&_a:hover]:text-gold">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo onDark />
          <p className="max-w-sm text-sm text-primary-foreground/85">{t("footer.tagline")}</p>
        </div>
        <ul className="space-y-2 text-sm">
          <li>
            <Link to="/account" className="hover:text-primary">
              {t("footer.account")}
            </Link>
          </li>
          <li>
            <Link to="/about" className="hover:text-primary">
              {t("footer.about")}
            </Link>
          </li>
          <li>
            <Link to="/contact" className="hover:text-primary">
              {t("footer.contact")}
            </Link>
          </li>
          <li>
            <Link to="/help" className="hover:text-primary">
              {t("footer.help")}
            </Link>
          </li>
        </ul>
        <ul className="space-y-2 text-sm">
          <li>
            <Link to="/terms" className="hover:text-primary">
              {t("footer.terms")}
            </Link>
          </li>
          <li>
            <Link to="/privacy" className="hover:text-primary">
              {t("footer.privacy")}
            </Link>
          </li>
          <li>
            <Link to="/merchant" className="hover:text-primary">
              {t("footer.merchant")}
            </Link>
          </li>
        </ul>
      </div>
      <div className="border-t border-primary-foreground/15 py-4 text-center text-xs text-primary-foreground/75">
        © {new Date().getFullYear()} Bago Market · ပဲခူးဈေး
      </div>
    </footer>
  );
}

const MAIN_TABS = ["/", "/categories", "/orders", "/cart", "/account"];

function BackButton() {
  const { t } = useApp();
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (MAIN_TABS.includes(path.replace(/\/$/, "") || "/")) return null;
  return (
    <div className="pt-4">
      <button
        type="button"
        onClick={() =>
          window.history.length > 1 ? router.history.back() : router.navigate({ to: "/" })
        }
        className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border/80 bg-card pl-2.5 pr-4 text-sm font-medium text-primary shadow-soft transition-colors hover:bg-accent"
      >
        <ChevronLeft className="size-4" /> {t("common.back")}
      </button>
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <Header />
      <main className="container-page min-w-0 flex-1 pb-24 md:pb-8">
        <BackButton />
        {children}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

/** Client-side gate for signed-in pages. Data is still protected by database rules. */
export function RequireAuth({ role, children }: { role?: "admin"; children: ReactNode }) {
  const { session, authReady, roles, t } = useApp();
  const { data: rolesLoaded } = useQuery({ queryKey: ["roles", session?.user.id], enabled: false });
  if (!authReady)
    return <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!session)
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="mb-4 text-muted-foreground">{t("auth.required")}</p>
        <Link
          to="/auth"
          className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          {t("nav.signin")}
        </Link>
      </div>
    );
  if (role && !roles.includes(role))
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {rolesLoaded === undefined ? t("common.loading") : t("auth.forbidden")}
      </p>
    );
  return <>{children}</>;
}
