import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wl = () => (supabase.from as any)("wishlist_items");

export function useWishlistIds() {
  const { session } = useApp();
  return useQuery({
    queryKey: ["wishlist-ids", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await wl().select("product_id");
      if (error) throw error;
      return new Set<string>((data ?? []).map((r: { product_id: string }) => r.product_id));
    },
  });
}

export function HeartButton({ productId, className }: { productId: string; className?: string }) {
  const { t, session } = useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const ids = useWishlistIds();
  const saved = !!ids.data?.has(productId);
  const m = useMutation({
    mutationFn: async () => {
      const { error } = saved
        ? await wl().delete().eq("product_id", productId)
        : await wl().insert({ user_id: session!.user.id, product_id: productId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(saved ? t("wish.removed") : t("wish.added"));
      qc.invalidateQueries({ queryKey: ["wishlist-ids"] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onError: () => toast.error(t("err.generic")),
  });
  return (
    <button type="button" aria-label={saved ? t("wish.remove") : t("wish.add")} aria-pressed={saved} disabled={m.isPending}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!session) { navigate({ to: "/auth" }); return; } m.mutate(); }}
      className={cn("grid size-9 place-items-center rounded-full bg-card/90 text-primary shadow-soft transition-colors hover:bg-card", className)}>
      <Heart className={cn("size-[18px]", saved && "fill-current")} />
    </button>
  );
}
