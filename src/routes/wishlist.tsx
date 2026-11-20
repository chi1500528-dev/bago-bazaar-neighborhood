import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { PRODUCT_FIELDS, type Product } from "@/lib/queries";
import { EmptyState } from "@/components/site/bits";
import { ProductCard, useAddToCart } from "@/components/site/cards";
import { RequireAuth } from "@/components/site/shell";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "My wish list · Bago Market" },
      { name: "description", content: "Products you saved for later on Bago Market." },
      { property: "og:title", content: "My wish list · Bago Market" },
      { property: "og:description", content: "Products you saved for later." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Wishlist />
    </RequireAuth>
  ),
});

function Wishlist() {
  const { t, session } = useApp();
  const { add, dialog } = useAddToCart();
  const q = useQuery({
    queryKey: ["wishlist", session?.user.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("wishlist_items")
        .select(`created_at, products(${PRODUCT_FIELDS})`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as { products: Product | null }[])
        .map((r) => r.products)
        .filter(Boolean) as Product[];
    },
  });
  return (
    <div className="space-y-4 py-6">
      {dialog}
      <h1 className="text-xl font-bold">{t("wish.title")}</h1>
      {q.isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : !(q.data ?? []).length ? (
        <EmptyState text={t("wish.empty")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {q.data!.map((p) => (
            <ProductCard key={p.id} p={p} onAdd={add} />
          ))}
        </div>
      )}
    </div>
  );
}
