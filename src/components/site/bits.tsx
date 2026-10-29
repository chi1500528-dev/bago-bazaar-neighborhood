import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Baby, CookingPot, HeartPulse, Package, Pencil, Shirt, ShoppingBasket, Smartphone, Sofa, Sparkles, Tv, Utensils,
  ImageOff, type LucideIcon,
} from "lucide-react";
import { useMediaUrl } from "@/lib/media";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Bago Market ပဲခူးဈေး">
      <img
        src="/logo.png"
        alt=""
        width={700}
        height={730}
        className={cn("h-11 w-auto shrink-0 object-contain", onDark && "rounded-lg bg-background/95 p-1")}
        decoding="async"
      />
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className={cn("font-display text-[17px] font-semibold tracking-tight", onDark ? "text-primary-foreground" : "text-foreground")}>Bago Market</span>
          <span className={cn("text-[13px] font-medium", onDark ? "text-primary-foreground" : "text-primary")} lang="my">ပဲခူးဈေး</span>
        </span>
      )}
    </Link>
  );
}

const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils, "shopping-basket": ShoppingBasket, shirt: Shirt, sparkles: Sparkles, tv: Tv,
  smartphone: Smartphone, sofa: Sofa, "cooking-pot": CookingPot, "heart-pulse": HeartPulse, baby: Baby,
  pencil: Pencil, package: Package,
};
export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const I = (name && ICONS[name]) || Package;
  return <I className={className} strokeWidth={1.8} />;
}

export function MediaImg({ path, alt, className, eager }: { path?: string | null | undefined; alt: string; className?: string | undefined; eager?: boolean | undefined }) {
  const isUrl = !!path && path.startsWith("http");
  const { data, isPending } = useMediaUrl(isUrl ? null : path);
  const src = isUrl ? path : data;
  const [loaded, setLoaded] = useState(false);
  if (!src) {
    if (path && isPending) return <div className={cn("animate-pulse bg-muted", className)} aria-label={alt} />;
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)} aria-label={alt}>
        <ImageOff className="size-6 opacity-40" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={cn("object-cover bg-muted transition-opacity duration-300 motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="py-8 md:py-12">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-border/70 pb-3">
        <h2 className="text-xl font-semibold md:text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
      <Package className="size-7 opacity-40" />
      <p className="max-w-md">{text}</p>
      {action}
    </div>
  );
}

export function LoadingGrid({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export function ErrorBox({ onRetry }: { onRetry?: () => void }) {
  const { t } = useApp();
  return (
    <div className="surface flex flex-col items-center gap-3 p-8 text-sm">
      <p className="text-destructive">{t("common.error")}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-primary underline underline-offset-4">
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status, kind = "order" }: { status: string; kind?: "order" | "shop" }) {
  const { t } = useApp();
  const tone =
    status === "completed" || status === "approved"
      ? "bg-primary-soft text-primary"
      : status === "cancelled" || status === "rejected" || status === "suspended"
        ? "bg-destructive/10 text-destructive"
        : status === "pending"
          ? "bg-gold-soft text-gold-foreground"
          : "bg-accent text-accent-foreground";
  const key = (kind === "order" ? `status.${status}` : `shopstatus.${status}`) as Parameters<typeof t>[0];
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", tone)}>{t(key)}</span>;
}

/** Phone-only action bar pinned just above the bottom tab menu. */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-20 md:hidden" aria-hidden />
      <div className="fixed inset-x-0 z-30 border-t bg-card/95 px-4 py-3 shadow-lg backdrop-blur md:hidden" style={{ bottom: "calc(3.5rem + 1px + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </>
  );
}
