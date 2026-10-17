
create extension if not exists pg_trgm;

create type public.app_role as enum ('admin','merchant','customer');
create type public.shop_status as enum ('pending','approved','rejected','suspended');
create type public.order_status as enum ('pending','confirmed','preparing','ready','out_for_delivery','completed','cancelled');
create type public.delivery_method as enum ('delivery','pickup');

create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- townships
create table public.townships (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_my text not null,
  name_en text not null,
  sort int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.townships to anon, authenticated;
grant all on public.townships to service_role;
alter table public.townships enable row level security;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  language text not null default 'my',
  township_id uuid references public.townships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger profiles_updated before update on public.profiles for each row execute function public.update_updated_at_column();

-- roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant insert, update, delete on public.user_roles to authenticated;

create policy "townships public read" on public.townships for select to anon, authenticated using (is_active or public.has_role(auth.uid(),'admin'));
create policy "townships admin" on public.townships for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant insert, update, delete on public.townships to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null)) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete cascade,
  slug text not null unique,
  name_my text not null,
  name_en text not null,
  icon text,
  image_url text,
  sort int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (is_active or public.has_role(auth.uid(),'admin'));
create policy "categories admin" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger categories_updated before update on public.categories for each row execute function public.update_updated_at_column();
create index categories_parent_idx on public.categories(parent_id);

-- shops
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  slug text not null unique,
  name text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  township_id uuid references public.townships(id) on delete set null,
  address text,
  phone text,
  logo_url text,
  cover_url text,
  opening_hours text,
  offers_delivery boolean not null default true,
  offers_pickup boolean not null default true,
  delivery_fee int not null default 0,
  delivery_note text,
  pickup_info text,
  is_food boolean not null default false,
  is_featured boolean not null default false,
  status public.shop_status not null default 'pending',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shops_owner_idx on public.shops(owner_id);
create index shops_township_idx on public.shops(township_id);
create index shops_name_trgm on public.shops using gin (name gin_trgm_ops);
grant select on public.shops to anon, authenticated;
grant insert, update on public.shops to authenticated;
grant all on public.shops to service_role;
alter table public.shops enable row level security;

create or replace function public.shop_is_public(_shop_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shops where id = _shop_id and status = 'approved' and is_active)
$$;
create or replace function public.is_shop_owner(_shop_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shops where id = _shop_id and owner_id = auth.uid())
$$;

create policy "shops public read" on public.shops for select to anon, authenticated using (status = 'approved' and is_active);
create policy "shops owner read" on public.shops for select to authenticated using (owner_id = auth.uid());
create policy "shops admin read" on public.shops for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "shops owner insert" on public.shops for insert to authenticated with check (owner_id = auth.uid());
create policy "shops owner update" on public.shops for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "shops admin update" on public.shops for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.shops_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.has_role(auth.uid(),'admin') then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.is_featured := false; new.is_active := true;
    insert into public.user_roles(user_id, role) values (new.owner_id, 'merchant') on conflict do nothing;
  else
    new.status := old.status; new.is_featured := old.is_featured; new.is_active := old.is_active; new.owner_id := old.owner_id;
  end if;
  if new.delivery_fee < 0 then new.delivery_fee := 0; end if;
  return new;
end; $$;
create trigger shops_guard_trg before insert or update on public.shops for each row execute function public.shops_guard();
create trigger shops_updated before update on public.shops for each row execute function public.update_updated_at_column();

-- products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price int not null,
  sale_price int,
  stock int not null default 0,
  is_active boolean not null default true,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_shop_idx on public.products(shop_id);
create index products_category_idx on public.products(category_id);
create index products_name_trgm on public.products using gin (name gin_trgm_ops);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read" on public.products for select to anon, authenticated using (is_active and public.shop_is_public(shop_id));
create policy "products owner read" on public.products for select to authenticated using (public.is_shop_owner(shop_id));
create policy "products admin read" on public.products for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "products owner insert" on public.products for insert to authenticated with check (public.is_shop_owner(shop_id));
create policy "products owner update" on public.products for update to authenticated using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));
create policy "products admin update" on public.products for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "products owner delete" on public.products for delete to authenticated using (public.is_shop_owner(shop_id));

create or replace function public.products_validate() returns trigger language plpgsql set search_path = public as $$
begin
  if new.price < 0 then raise exception 'price must be >= 0'; end if;
  if new.stock < 0 then raise exception 'stock must be >= 0'; end if;
  if new.sale_price is not null and (new.sale_price < 0 or new.sale_price >= new.price) then new.sale_price := null; end if;
  return new;
end; $$;
create trigger products_validate_trg before insert or update on public.products for each row execute function public.products_validate();
create trigger products_updated before update on public.products for each row execute function public.update_updated_at_column();

-- promotions
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  title_my text not null,
  title_en text not null,
  subtitle_my text,
  subtitle_en text,
  link text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.promotions to anon, authenticated;
grant insert, update, delete on public.promotions to authenticated;
grant all on public.promotions to service_role;
alter table public.promotions enable row level security;
create policy "promotions public read" on public.promotions for select to anon, authenticated using (is_active and starts_at <= now() and (ends_at is null or ends_at > now()));
create policy "promotions admin" on public.promotions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger promotions_updated before update on public.promotions for each row execute function public.update_updated_at_column();

-- orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigserial unique,
  customer_id uuid not null,
  shop_id uuid not null references public.shops(id) on delete restrict,
  status public.order_status not null default 'pending',
  delivery_method public.delivery_method not null,
  recipient_name text not null,
  phone text not null,
  township_id uuid references public.townships(id) on delete set null,
  address text,
  note text,
  subtotal int not null,
  delivery_fee int not null default 0,
  total int not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, idempotency_key)
);
create index orders_customer_idx on public.orders(customer_id, created_at desc);
create index orders_shop_idx on public.orders(shop_id, created_at desc);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders customer read" on public.orders for select to authenticated using (customer_id = auth.uid());
create policy "orders shop read" on public.orders for select to authenticated using (public.is_shop_owner(shop_id));
create policy "orders admin read" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger orders_updated before update on public.orders for each row execute function public.update_updated_at_column();

create or replace function public.can_view_order(_order_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders o where o.id = _order_id and (o.customer_id = auth.uid() or public.is_shop_owner(o.shop_id) or public.has_role(auth.uid(),'admin')))
$$;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  image_url text,
  unit_price int not null,
  quantity int not null,
  line_total int not null,
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items(order_id);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "order items read" on public.order_items for select to authenticated using (public.can_view_order(order_id));

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  changed_by uuid,
  created_at timestamptz not null default now()
);
create index order_hist_order_idx on public.order_status_history(order_id);
grant select on public.order_status_history to authenticated;
grant all on public.order_status_history to service_role;
alter table public.order_status_history enable row level security;
create policy "order history read" on public.order_status_history for select to authenticated using (public.can_view_order(order_id));

-- place_order
create or replace function public.place_order(
  p_shop_id uuid, p_items jsonb, p_method public.delivery_method,
  p_recipient_name text, p_phone text, p_township_id uuid, p_address text, p_note text, p_idempotency_key text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_shop public.shops%rowtype;
  v_item jsonb;
  v_prod public.products%rowtype;
  v_qty int;
  v_price int;
  v_subtotal int := 0;
  v_fee int := 0;
  v_order uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then raise exception 'INVALID_KEY'; end if;
  select id into v_existing from public.orders where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if v_existing is not null then return v_existing; end if;

  select * into v_shop from public.shops where id = p_shop_id;
  if not found or v_shop.status <> 'approved' or not v_shop.is_active then raise exception 'SHOP_UNAVAILABLE'; end if;
  if p_method = 'delivery' and not v_shop.offers_delivery then raise exception 'METHOD_UNAVAILABLE'; end if;
  if p_method = 'pickup' and not v_shop.offers_pickup then raise exception 'METHOD_UNAVAILABLE'; end if;
  if coalesce(length(trim(p_recipient_name)),0) = 0 or coalesce(length(trim(p_phone)),0) < 6 then raise exception 'INVALID_CONTACT'; end if;
  if p_method = 'delivery' and coalesce(length(trim(p_address)),0) = 0 then raise exception 'INVALID_ADDRESS'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then raise exception 'INVALID_ITEMS'; end if;

  if p_method = 'delivery' then v_fee := v_shop.delivery_fee; end if;

  insert into public.orders (customer_id, shop_id, delivery_method, recipient_name, phone, township_id, address, note, subtotal, delivery_fee, total, idempotency_key)
  values (v_uid, p_shop_id, p_method, trim(p_recipient_name), trim(p_phone), p_township_id, nullif(trim(coalesce(p_address,'')),''), nullif(trim(coalesce(p_note,'')),''), 0, v_fee, 0, p_idempotency_key)
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_prod from public.products where id = (v_item->>'product_id')::uuid for update;
    if not found or v_prod.shop_id <> p_shop_id or not v_prod.is_active then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    if v_prod.stock < v_qty then raise exception 'OUT_OF_STOCK:%', v_prod.id; end if;
    v_price := case when v_prod.sale_price is not null and v_prod.sale_price < v_prod.price then v_prod.sale_price else v_prod.price end;
    update public.products set stock = stock - v_qty where id = v_prod.id;
    insert into public.order_items(order_id, product_id, name, image_url, unit_price, quantity, line_total)
    values (v_order, v_prod.id, v_prod.name, v_prod.images[1], v_price, v_qty, v_price * v_qty);
    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal + v_fee where id = v_order;
  insert into public.order_status_history(order_id, status, changed_by) values (v_order, 'pending', v_uid);
  return v_order;
end; $$;
revoke all on function public.place_order(uuid, jsonb, public.delivery_method, text, text, uuid, text, text, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, public.delivery_method, text, text, uuid, text, text, text) to authenticated;

create or replace function public.update_order_status(p_order_id uuid, p_status public.order_status)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_o public.orders%rowtype;
  v_uid uuid := auth.uid();
  v_is_owner boolean;
  v_is_admin boolean;
  v_ok boolean := false;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  v_is_owner := exists(select 1 from public.shops where id = v_o.shop_id and owner_id = v_uid);
  v_is_admin := public.has_role(v_uid,'admin');

  if v_is_owner or v_is_admin then
    v_ok := (v_o.status = 'pending' and p_status in ('confirmed','cancelled'))
      or (v_o.status = 'confirmed' and p_status in ('preparing','cancelled'))
      or (v_o.status = 'preparing' and ((v_o.delivery_method = 'pickup' and p_status = 'ready') or (v_o.delivery_method = 'delivery' and p_status = 'out_for_delivery') or p_status = 'cancelled'))
      or (v_o.status in ('ready','out_for_delivery') and p_status = 'completed');
  elsif v_o.customer_id = v_uid then
    v_ok := v_o.status = 'pending' and p_status = 'cancelled';
  else
    raise exception 'FORBIDDEN';
  end if;
  if not v_ok then raise exception 'INVALID_TRANSITION'; end if;

  if p_status = 'cancelled' then
    update public.products p set stock = p.stock + oi.quantity from public.order_items oi where oi.order_id = v_o.id and oi.product_id = p.id;
  end if;
  update public.orders set status = p_status where id = v_o.id;
  insert into public.order_status_history(order_id, status, changed_by) values (v_o.id, p_status, v_uid);
end; $$;
revoke all on function public.update_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;

alter publication supabase_realtime add table public.orders;

-- storage policies for 'media' bucket
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
create policy "media own insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media own update" on storage.objects for update to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media own delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- seed townships
insert into public.townships (slug, name_my, name_en, sort) values
('bago','ပဲခူး','Bago',1),('thanatpin','သနပ်ပင်','Thanatpin',2),('kawa','ကဝ','Kawa',3),('waw','ဝေါ','Waw',4),
('nyaunglebin','ညောင်လေးပင်','Nyaunglebin',5),('daik-u','ဒိုက်ဦး','Daik-U',6),('shwegyin','ရွှေကျင်','Shwegyin',7),('kyauktaga','ကျောက်တံခါး','Kyauktaga',8),
('taungoo','တောင်ငူ','Taungoo',9),('yedashe','ရေတာရှည်','Yedashe',10),('oktwin','အုတ်တွင်း','Oktwin',11),('phyu','ဖြူး','Phyu',12),
('htantabin','ထန်းတပင်','Htantabin',13),('kyaukkyi','ကျောက်ကြီး','Kyaukkyi',14),('pyay','ပြည်','Pyay',15),('paukkhaung','ပေါက်ခေါင်း','Paukkhaung',16),
('paungde','ပေါင်းတည်','Paungde',17),('padaung','ပန်းတောင်း','Padaung',18),('shwedaung','ရွှေတောင်','Shwedaung',19),('thegon','သဲကုန်း','Thegon',20),
('tharrawaddy','သာယာဝတီ','Tharrawaddy',21),('letpadan','လက်ပံတန်း','Letpadan',22),('minhla','မင်းလှ','Minhla',23),('okpho','အုတ်ဖို','Okpho',24),
('gyobingauk','ကြို့ပင်ကောက်','Gyobingauk',25),('monyo','မိုးညို','Monyo',26),('zigon','ဇီးကုန်း','Zigon',27),('nattalin','နတ်တလင်း','Nattalin',28);

-- seed categories
insert into public.categories (slug, name_my, name_en, icon, sort) values
('food','အစားအသောက်','Food & Restaurants','utensils',1),
('groceries','ကုန်စုံဆိုင်','Groceries','shopping-basket',2),
('fashion','အဝတ်အထည်','Fashion & Clothing','shirt',3),
('beauty','အလှအပနှင့် ကိုယ်ရေးကိုယ်တာသုံးပစ္စည်းများ','Beauty & Personal Care','sparkles',4),
('electronics','အီလက်ထရွန်နစ်ပစ္စည်းများ','Electronics','tv',5),
('phones','ဖုန်းနှင့် ဆက်စပ်ပစ္စည်းများ','Phones & Accessories','smartphone',6),
('home','အိမ်သုံးပစ္စည်းများ','Home & Living','sofa',7),
('kitchen','မီးဖိုချောင်သုံးပစ္စည်းများ','Kitchen','cooking-pot',8),
('health','ကျန်းမာရေးသုံးပစ္စည်းများ','Health & Wellness','heart-pulse',9),
('baby','ကလေးအသုံးအဆောင်များ','Baby & Kids','baby',10),
('stationery','စာရေးကိရိယာနှင့် ရုံးသုံးပစ္စည်းများ','Stationery & Office','pencil',11),
('other','အခြားပစ္စည်းများ','Other Products','package',12);

insert into public.categories (parent_id, slug, name_my, name_en, sort)
select c.id, v.slug, v.name_my, v.name_en, v.sort from (values
('fashion','fashion-men','အမျိုးသားဝတ်','Men''s Clothing',1),
('fashion','fashion-women','အမျိုးသမီးဝတ်','Women''s Clothing',2),
('fashion','fashion-kids','ကလေးဝတ်','Children''s Clothing',3),
('fashion','fashion-shoes','ဖိနပ်','Shoes',4),
('fashion','fashion-bags','အိတ်နှင့် ဆက်စပ်ပစ္စည်း','Bags & Accessories',5),
('food','food-myanmar','မြန်မာအစားအစာ','Myanmar Food',1),
('food','food-rice-curry','ထမင်းဟင်း','Rice & Curry',2),
('food','food-snacks','မုန့်ပဲသရေစာ','Snacks',3),
('food','food-drinks','အချိုရည်နှင့် အဖျော်ယမကာ','Drinks',4),
('food','food-bakery','မုန့်ဖုတ်','Bakery',5),
('food','food-desserts','အချိုပွဲ','Desserts',6),
('groceries','groc-rice','ဆန်နှင့် အခြေခံစားကုန်','Rice & Staples',1),
('groceries','groc-fresh','လတ်ဆတ်သော ဟင်းသီးဟင်းရွက်','Fresh Produce',2),
('groceries','groc-household','အိမ်သုံးကုန်ပစ္စည်း','Household Essentials',3),
('groceries','groc-packaged','ထုပ်ပိုးအစားအစာ','Packaged Food',4)
) as v(parent_slug, slug, name_my, name_en, sort)
join public.categories c on c.slug = v.parent_slug;
