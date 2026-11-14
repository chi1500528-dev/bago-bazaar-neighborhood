import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SHOP_FIELDS =
  "id, slug, name, description, logo_url, cover_url, township_id, category_id, offers_delivery, offers_pickup, delivery_fee, opening_hours, is_food, is_featured, address, phone, pickup_info, delivery_note";
export const PRODUCT_FIELDS =
  "id, shop_id, name, description, price, sale_price, stock, images, category_id, created_at, shops!inner(id, name, slug, status, is_active)";

export const townshipsQuery = queryOptions({
  queryKey: ["townships"],
  staleTime: 60 * 60 * 1000,
  queryFn: async () => {
    const { data, error } = await supabase.from("townships").select("id, slug, name_my, name_en").order("sort");
    if (error) throw error;
    return data;
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  staleTime: 10 * 60 * 1000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, parent_id, slug, name_my, name_en, icon, sort, is_active")
      .eq("is_active", true)
      .order("sort");
    if (error) throw error;
    return data;
  },
});

export type Shop = {
  id: string; slug: string; name: string; description: string | null; logo_url: string | null; cover_url: string | null;
  township_id: string | null; category_id: string | null; offers_delivery: boolean; offers_pickup: boolean;
  delivery_fee: number; opening_hours: string | null; is_food: boolean; is_featured: boolean; address: string | null;
  phone: string | null; pickup_info: string | null; delivery_note: string | null;
};
export type Product = {
  id: string; shop_id: string; name: string; description: string | null; price: number; sale_price: number | null;
  stock: number; images: string[]; category_id: string | null; created_at: string;
  shops: { id: string; name: string; slug: string };
};

export function useCartShop(shopId: string | undefined) {
  return useQuery({
    queryKey: ["cart-shop", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("shops")
        .select("id, name, slug, offers_delivery, offers_pickup, delivery_fee, pickup_info, address, township_id, phone")
        .eq("id", shopId!).maybeSingle();
      return data;
    },
  });
}


// ---- Public catalog reads, shared by page loaders (pre-filled on the server) and components ----
export const homeShopsQuery = queryOptions({
  queryKey: ["home-shops"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("shops").select(SHOP_FIELDS).eq("status", "approved").eq("is_active", true)
      .order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(24);
    if (error) throw error;
    return data as Shop[];
  },
});
export const homeProductsQuery = queryOptions({
  queryKey: ["home-products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products").select(PRODUCT_FIELDS).eq("is_active", true)
      .eq("shops.status", "approved").eq("shops.is_active", true)
      .order("created_at", { ascending: false }).limit(8);
    if (error) throw error;
    return data as unknown as Product[];
  },
});
export const promosQuery = queryOptions({
  queryKey: ["promos"],
  queryFn: async () => {
    const { data, error } = await supabase.from("promotions").select("*").order("sort").limit(6);
    if (error) throw error;
    return data;
  },
});
export const productQuery = (id: string) => queryOptions({
  queryKey: ["product", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select(PRODUCT_FIELDS).eq("id", id).eq("is_active", true).maybeSingle();
    if (error) throw error;
    return data as unknown as Product | null;
  },
});
export const shopQuery = (slug: string) => queryOptions({
  queryKey: ["shop", slug],
  queryFn: async () => {
    const { data, error } = await supabase.from("shops").select(SHOP_FIELDS).eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (data) return data as Shop;
    // Renamed shop: old address still works.
    const { data: old } = await supabase.from("shop_slug_history").select("shop_id").eq("old_slug", slug).maybeSingle();
    if (!old) return null;
    const { data: moved } = await supabase.from("shops").select(SHOP_FIELDS).eq("id", old.shop_id).maybeSingle();
    return (moved as Shop | null) ?? null;
  },
});
export const shopCategoriesQuery = (shopId: string | undefined) => queryOptions({
  queryKey: ["shop-categories", shopId],
  enabled: !!shopId,
  queryFn: async () => {
    const { data, error } = await supabase.from("shop_categories").select("id, name, sort").eq("shop_id", shopId!).order("sort").order("created_at");
    if (error) throw error;
    return data;
  },
});
export const shopProductsQuery = (shopId: string | undefined) => queryOptions({
  queryKey: ["shop-products", shopId],
  enabled: !!shopId,
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select(PRODUCT_FIELDS)
      .eq("shop_id", shopId!).eq("is_active", true).order("created_at", { ascending: false }).limit(60);
    if (error) throw error;
    return data as unknown as Product[];
  },
});
export const categoryShopsQuery = (categoryId: string | undefined) => queryOptions({
  queryKey: ["cat-shops", categoryId],
  enabled: !!categoryId,
  queryFn: async () => {
    const { data, error } = await supabase.from("shops").select(SHOP_FIELDS)
      .eq("status", "approved").eq("is_active", true).eq("category_id", categoryId!).limit(8);
    if (error) throw error;
    return data as Shop[];
  },
});

/** Wait for data to pre-fill the page, but never longer than `ms` — a slow database must not block the page. */
export function warm(work: Promise<unknown>[], ms = 2500) {
  return Promise.race([Promise.allSettled(work), new Promise((r) => setTimeout(r, ms))]).then(() => undefined);
}
