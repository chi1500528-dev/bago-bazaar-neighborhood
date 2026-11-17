alter table public.products add column if not exists sku text, add column if not exists barcode text;
create unique index if not exists products_shop_sku_uniq on public.products (shop_id, lower(sku)) where sku is not null and sku <> '';
create unique index if not exists products_shop_barcode_uniq on public.products (shop_id, barcode) where barcode is not null and barcode <> '';

create or replace function public.products_validate()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.price < 0 then raise exception 'INVALID_PRICE'; end if;
  if new.stock < 0 then raise exception 'INVALID_STOCK'; end if;
  if new.sale_price is not null and (new.sale_price < 0 or new.sale_price >= new.price) then raise exception 'INVALID_SALE_PRICE'; end if;
  if new.is_active and new.price <= 0 and (tg_op = 'INSERT' or not old.is_active or old.price is distinct from new.price) then
    raise exception 'ZERO_PRICE_ACTIVE';
  end if;
  new.sku := nullif(btrim(coalesce(new.sku,'')), '');
  new.barcode := nullif(btrim(coalesce(new.barcode,'')), '');
  return new;
end; $$;

create table public.product_imports (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  file_name text,
  added integer not null default 0,
  updated integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.product_imports to authenticated;
grant all on public.product_imports to service_role;
alter table public.product_imports enable row level security;
create policy "imports owner read" on public.product_imports for select to authenticated using (public.is_shop_owner(shop_id));
create policy "imports owner insert" on public.product_imports for insert to authenticated with check (public.is_shop_owner(shop_id) and user_id = auth.uid());

create table public.product_templates (
  id uuid primary key default gen_random_uuid(),
  group_my text not null,
  group_en text not null,
  name_my text not null,
  name_en text not null,
  sort integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.product_templates to authenticated;
grant all on public.product_templates to service_role;
alter table public.product_templates enable row level security;
create policy "templates read" on public.product_templates for select to authenticated using (is_active or public.has_role(auth.uid(),'admin'));
create policy "templates admin" on public.product_templates for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant insert, update, delete on public.product_templates to authenticated;
create trigger product_templates_updated before update on public.product_templates for each row execute function public.update_updated_at_column();