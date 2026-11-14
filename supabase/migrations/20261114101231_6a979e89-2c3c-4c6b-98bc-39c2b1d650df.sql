CREATE TABLE public.shop_categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE, name text NOT NULL, sort integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.shop_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_categories TO authenticated;
GRANT ALL ON public.shop_categories TO service_role;
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shopcat public read" ON public.shop_categories FOR SELECT TO anon, authenticated USING (public.shop_is_public(shop_id) OR public.is_shop_owner(shop_id));
CREATE POLICY "shopcat owner insert" ON public.shop_categories FOR INSERT TO authenticated WITH CHECK (public.is_shop_owner(shop_id));
CREATE POLICY "shopcat owner update" ON public.shop_categories FOR UPDATE TO authenticated USING (public.is_shop_owner(shop_id)) WITH CHECK (public.is_shop_owner(shop_id));
CREATE POLICY "shopcat owner delete" ON public.shop_categories FOR DELETE TO authenticated USING (public.is_shop_owner(shop_id));
CREATE TRIGGER shop_categories_updated BEFORE UPDATE ON public.shop_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.products ADD COLUMN shop_category_id uuid REFERENCES public.shop_categories(id) ON DELETE SET NULL;

CREATE TABLE public.shop_slug_history (old_slug text PRIMARY KEY, shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.shop_slug_history TO anon, authenticated;
GRANT ALL ON public.shop_slug_history TO service_role;
ALTER TABLE public.shop_slug_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slug history read" ON public.shop_slug_history FOR SELECT TO anon, authenticated USING (public.shop_is_public(shop_id));

CREATE OR REPLACE FUNCTION public.shops_slug_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if new.slug is distinct from old.slug then
    if exists (select 1 from shops where slug = new.slug and id <> new.id) then
      new.slug := new.slug || '-' || substr(md5(new.id::text),1,5);
    end if;
    insert into shop_slug_history(old_slug, shop_id) values (old.slug, old.id) on conflict (old_slug) do update set shop_id = excluded.shop_id;
    delete from shop_slug_history where old_slug = new.slug;
  end if;
  return new;
end $$;
CREATE TRIGGER shops_slug_history_trg BEFORE UPDATE OF slug ON public.shops FOR EACH ROW EXECUTE FUNCTION public.shops_slug_history();