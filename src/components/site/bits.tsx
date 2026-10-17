import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Baby, CookingPot, HeartPulse, Package, Pencil, Shirt, ShoppingBasket, Smartphone, Sofa, Sparkles, Tv, Utensils,
  ShoppingBag, ImageOff, type LucideIcon,
} from "lucide-react";
import { useMediaUrl } from "@/lib/media";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Bago Market ပဲခူးဈေး">
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <ShoppingBag className="size-5" strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-[15px] font-bold tracking-tight text-foreground">Bago Market</span>
          <span className="text-xs text-gold-foreground/80" lang="my">ပဲခူးဈေး</span>
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
  const { data } = useMediaUrl(isUrl ? null : path);
  const src = isUrl ? path : data;
  if (!src)
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)} aria-label={alt}>
        <ImageOff className="size-6 opacity-40" />
      </div>
    );
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className={cn("object-cover", className)} />;
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="py-7 md:py-9">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
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
