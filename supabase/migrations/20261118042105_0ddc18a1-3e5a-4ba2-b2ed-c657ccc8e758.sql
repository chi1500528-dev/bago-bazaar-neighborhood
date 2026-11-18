-- 1. Stock ledger
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text,
  barcode text,
  delta integer not null,
  stock_after integer not null,
  reason text not null check (reason in ('opening_balance','new_product','manual_edit','online_order','order_cancelled','pos_sale','pos_void')),
  ref_type text,
  ref_id uuid,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index stock_movements_product_idx on public.stock_movements(product_id, created_at desc);
create index stock_movements_shop_idx on public.stock_movements(shop_id, created_at desc);
grant select on public.stock_movements to authenticated;
grant all on public.stock_movements to service_role;
alter table public.stock_movements enable row level security;
create policy "Owners and admins read stock movements" on public.stock_movements for select to authenticated
  using (public.is_shop_owner(shop_id) or public.has_role(auth.uid(),'admin'));

create or replace function public.products_stock_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_reason text := nullif(current_setting('bm.stock_reason', true), '');
  v_ref text := nullif(current_setting('bm.stock_ref', true), '');
  v_delta int;
begin
  if tg_op = 'INSERT' then
    if new.stock = 0 then return new; end if;
    v_delta := new.stock; v_reason := coalesce(v_reason, 'new_product');
  else
    if new.stock = old.stock then return new; end if;
    v_delta := new.stock - old.stock; v_reason := coalesce(v_reason, 'manual_edit');
  end if;
  insert into public.stock_movements(shop_id, product_id, product_name, sku, barcode, delta, stock_after, reason, ref_type, ref_id, created_by)
  values (new.shop_id, new.id, new.name, new.sku, new.barcode, v_delta, new.stock, v_reason,
    case v_reason when 'online_order' then 'order' when 'order_cancelled' then 'order' when 'pos_sale' then 'pos_sale' when 'pos_void' then 'pos_sale' else null end,
    case when v_ref is null then null else v_ref::uuid end, auth.uid());
  return new;
end $$;
create trigger products_stock_ledger_trg after insert or update of stock on public.products
  for each row execute function public.products_stock_ledger();

insert into public.stock_movements(shop_id, product_id, product_name, sku, barcode, delta, stock_after, reason)
select shop_id, id, name, sku, barcode, stock, stock, 'opening_balance' from public.products;

-- 2. POS sales
create table public.pos_counters (shop_id uuid primary key references public.shops(id), last_no bigint not null default 0);
grant all on public.pos_counters to service_role;
alter table public.pos_counters enable row level security;

create table public.pos_sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id),
  sale_number bigint not null,
  status text not null default 'completed' check (status in ('completed','voided')),
  payment_method text not null check (payment_method in ('cash','kbzpay','wave','other')),
  subtotal integer not null,
  total integer not null,
  cash_received integer,
  change_due integer,
  idempotency_key text not null,
  request_hash text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  unique (shop_id, sale_number),
  unique (shop_id, idempotency_key),
  check (payment_method = 'cash' or (cash_received is null and change_due is null)),
  check (cash_received is null or (cash_received >= total and change_due = cash_received - total))
);
create index pos_sales_shop_day_idx on public.pos_sales(shop_id, created_at desc);
grant select on public.pos_sales to authenticated;
grant all on public.pos_sales to service_role;
alter table public.pos_sales enable row level security;
create policy "Owners and admins read sales" on public.pos_sales for select to authenticated
  using (public.is_shop_owner(shop_id) or public.has_role(auth.uid(),'admin'));

create table public.pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.pos_sales(id),
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  sku text,
  barcode text,
  unit_price integer not null,
  quantity integer not null check (quantity between 1 and 999),
  line_total integer not null
);
create index pos_sale_items_sale_idx on public.pos_sale_items(sale_id);
grant select on public.pos_sale_items to authenticated;
grant all on public.pos_sale_items to service_role;
alter table public.pos_sale_items enable row level security;
create policy "Owners and admins read sale items" on public.pos_sale_items for select to authenticated
  using (exists (select 1 from public.pos_sales s where s.id = sale_id and (public.is_shop_owner(s.shop_id) or public.has_role(auth.uid(),'admin'))));

create or replace function public.pos_checkout(p_shop_id uuid, p_items jsonb, p_payment text, p_cash_received integer, p_expected_total integer, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_sale public.pos_sales%rowtype;
  v_no bigint;
  v_line record;
  v_e jsonb;
  v_total int := 0;
  v_hash text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_shop_id is null or not (public.is_shop_owner(p_shop_id) or public.has_role(v_uid,'admin')) then raise exception 'FORBIDDEN'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 or length(p_idempotency_key) > 100 then raise exception 'INVALID_KEY'; end if;
  if p_payment is null or p_payment not in ('cash','kbzpay','wave','other') then raise exception 'INVALID_PAYMENT'; end if;
  if p_payment <> 'cash' and p_cash_received is not null then raise exception 'CASH_NOT_ALLOWED'; end if;
  if p_cash_received is not null and p_cash_received < 0 then raise exception 'CASH_TOO_LOW'; end if;

  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'INVALID_ITEMS'; end if;
  for v_e in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_e) is distinct from 'object'
      or jsonb_typeof(v_e->'product_id') is distinct from 'string'
      or (v_e->>'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'INVALID_ITEMS'; end if;
    if jsonb_typeof(v_e->'quantity') is distinct from 'number' or (v_e->>'quantity') !~ '^[0-9]{1,3}$'
      or (v_e->>'quantity')::int < 1 then raise exception 'INVALID_QUANTITY'; end if;
  end loop;

  create temp table if not exists _pos_req(product_id uuid primary key, qty int not null) on commit drop;
  truncate _pos_req;
  insert into _pos_req
    select (e->>'product_id')::uuid, sum((e->>'quantity')::int) from jsonb_array_elements(p_items) e group by 1;
  if not exists (select 1 from _pos_req) then raise exception 'INVALID_ITEMS'; end if;
  if exists (select 1 from _pos_req where qty < 1 or qty > 999) then raise exception 'INVALID_QUANTITY'; end if;

  select md5(jsonb_build_object(
      'items', (select jsonb_agg(jsonb_build_array(product_id::text, qty) order by product_id) from _pos_req),
      'payment', p_payment, 'cash', p_cash_received)::text) into v_hash;

  perform pg_advisory_xact_lock(hashtextextended('pos:' || p_shop_id::text || ':' || p_idempotency_key, 0));
  select * into v_sale from public.pos_sales where shop_id = p_shop_id and idempotency_key = p_idempotency_key;
  if found then
    if v_sale.request_hash <> v_hash then raise exception 'IDEMPOTENCY_MISMATCH'; end if;
    return jsonb_build_object('sale_id', v_sale.id, 'sale_number', v_sale.sale_number, 'total', v_sale.total, 'change_due', v_sale.change_due, 'replayed', true);
  end if;

  perform 1 from public.products p where p.id in (select product_id from _pos_req) order by p.id for update;
  if (select count(*) from public.products p join _pos_req r on r.product_id = p.id where p.shop_id = p_shop_id) <> (select count(*) from _pos_req) then
    raise exception 'PRODUCT_UNAVAILABLE'; end if;
  for v_line in select p.id from public.products p join _pos_req r on r.product_id = p.id
      where (case when p.sale_price is not null and p.sale_price < p.price then p.sale_price else p.price end) <= 0 order by p.id limit 1 loop
    raise exception 'ZERO_PRICE:%', v_line.id;
  end loop;
  for v_line in select p.id from public.products p join _pos_req r on r.product_id = p.id where p.stock < r.qty order by p.id limit 1 loop
    raise exception 'OUT_OF_STOCK:%', v_line.id;
  end loop;
  select sum(r.qty * (case when p.sale_price is not null and p.sale_price < p.price then p.sale_price else p.price end))::int into v_total
    from public.products p join _pos_req r on r.product_id = p.id;
  if v_total is null or v_total <= 0 then raise exception 'INVALID_ITEMS'; end if;
  if p_expected_total is distinct from v_total then raise exception 'PRICE_CHANGED:%', v_total; end if;
  if p_cash_received is not null and p_cash_received < v_total then raise exception 'CASH_TOO_LOW'; end if;

  insert into public.pos_counters(shop_id, last_no) values (p_shop_id, 1)
    on conflict (shop_id) do update set last_no = public.pos_counters.last_no + 1 returning last_no into v_no;
  insert into public.pos_sales(shop_id, sale_number, payment_method, subtotal, total, cash_received, change_due, idempotency_key, request_hash, created_by)
    values (p_shop_id, v_no, p_payment, v_total, v_total, p_cash_received, case when p_cash_received is null then null else p_cash_received - v_total end, p_idempotency_key, v_hash, v_uid)
    returning id into v_id;
  insert into public.pos_sale_items(sale_id, product_id, name, sku, barcode, unit_price, quantity, line_total)
    select v_id, p.id, p.name, p.sku, p.barcode, x.price, r.qty, x.price * r.qty
    from public.products p join _pos_req r on r.product_id = p.id
    cross join lateral (select case when p.sale_price is not null and p.sale_price < p.price then p.sale_price else p.price end as price) x;
  perform set_config('bm.stock_reason','pos_sale',true);
  perform set_config('bm.stock_ref', v_id::text, true);
  update public.products p set stock = p.stock - r.qty from _pos_req r where r.product_id = p.id;
  perform set_config('bm.stock_reason','',true);
  perform set_config('bm.stock_ref','',true);
  return jsonb_build_object('sale_id', v_id, 'sale_number', v_no, 'total', v_total,
    'change_due', case when p_cash_received is null then null else p_cash_received - v_total end, 'replayed', false);
end $$;

create or replace function public.pos_void_sale(p_sale_id uuid, p_reason text, p_items_returned boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_s public.pos_sales%rowtype; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_s from public.pos_sales where id = p_sale_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not (public.is_shop_owner(v_s.shop_id) or public.has_role(v_uid,'admin')) then raise exception 'FORBIDDEN'; end if;
  if v_s.status = 'voided' then raise exception 'ALREADY_VOIDED'; end if;
  if p_items_returned is not true then raise exception 'CONFIRM_RETURN'; end if;
  if coalesce(length(btrim(p_reason)),0) = 0 then raise exception 'REASON_REQUIRED'; end if;
  perform 1 from public.products p where p.id in (select product_id from public.pos_sale_items where sale_id = p_sale_id) order by p.id for update;
  perform set_config('bm.stock_reason','pos_void',true);
  perform set_config('bm.stock_ref', p_sale_id::text, true);
  update public.products p set stock = p.stock + i.qty
    from (select product_id, sum(quantity) qty from public.pos_sale_items where sale_id = p_sale_id and product_id is not null group by 1) i
    where i.product_id = p.id;
  perform set_config('bm.stock_reason','',true);
  perform set_config('bm.stock_ref','',true);
  update public.pos_sales set status = 'voided', voided_at = now(), voided_by = v_uid, void_reason = left(btrim(p_reason), 200) where id = p_sale_id;
end $$;

create or replace function public.pos_day(p_shop_id uuid, p_day date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_day date := coalesce(p_day, (now() at time zone 'Asia/Yangon')::date);
begin
  if not (public.is_shop_owner(p_shop_id) or public.has_role(auth.uid(),'admin')) then raise exception 'FORBIDDEN'; end if;
  return (
    with s as (select * from public.pos_sales where shop_id = p_shop_id and (created_at at time zone 'Asia/Yangon')::date = v_day)
    select jsonb_build_object(
      'day', v_day,
      'revenue', coalesce((select sum(total) from s where status='completed'),0),
      'count', (select count(*) from s where status='completed'),
      'voided', (select count(*) from s where status='voided'),
      'by_method', coalesce((select jsonb_object_agg(payment_method, amt) from (select payment_method, sum(total) amt from s where status='completed' group by 1) m), '{}'::jsonb),
      'sales', coalesce((select jsonb_agg(jsonb_build_object('id',id,'sale_number',sale_number,'status',status,'payment_method',payment_method,'total',total,'created_at',created_at) order by created_at desc) from s), '[]'::jsonb)
    ));
end $$;

revoke execute on function public.pos_checkout(uuid,jsonb,text,integer,integer,text) from public, anon;
revoke execute on function public.pos_void_sale(uuid,text,boolean) from public, anon;
revoke execute on function public.pos_day(uuid,date) from public, anon;
revoke execute on function public.products_stock_ledger() from public, anon, authenticated;
grant execute on function public.pos_checkout(uuid,jsonb,text,integer,integer,text) to authenticated;
grant execute on function public.pos_void_sale(uuid,text,boolean) to authenticated;
grant execute on function public.pos_day(uuid,date) to authenticated;

-- 3. Online orders
create or replace function public.place_order(p_shop_id uuid, p_items jsonb, p_method delivery_method, p_recipient_name text, p_phone text, p_township_id uuid, p_address text, p_note text, p_idempotency_key text)
 returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid(); v_existing uuid; v_shop public.shops%rowtype; v_item jsonb; v_prod public.products%rowtype;
  v_qty int; v_price int; v_subtotal int := 0; v_fee int := 0; v_order uuid;
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
  perform 1 from public.products where id in (
    select (e->>'product_id')::uuid from jsonb_array_elements(p_items) e
    where jsonb_typeof(e) = 'object' and (e->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) order by id for update;
  perform set_config('bm.stock_reason','online_order',true);
  perform set_config('bm.stock_ref', v_order::text, true);
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
  perform set_config('bm.stock_reason','',true);
  perform set_config('bm.stock_ref','',true);
  update public.orders set subtotal = v_subtotal, total = v_subtotal + v_fee where id = v_order;
  insert into public.order_status_history(order_id, status, changed_by) values (v_order, 'pending', v_uid);
  return v_order;
end; $function$;

create or replace function public.update_order_status(p_order_id uuid, p_status order_status)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_o public.orders%rowtype; v_uid uuid := auth.uid(); v_is_owner boolean; v_is_admin boolean; v_ok boolean := false;
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
    perform 1 from public.products where id in (select product_id from public.order_items where order_id = v_o.id) order by id for update;
    perform set_config('bm.stock_reason','order_cancelled',true);
    perform set_config('bm.stock_ref', v_o.id::text, true);
    update public.products p set stock = p.stock + i.qty
      from (select product_id, sum(quantity) qty from public.order_items where order_id = v_o.id and product_id is not null group by 1) i
      where i.product_id = p.id;
    perform set_config('bm.stock_reason','',true);
    perform set_config('bm.stock_ref','',true);
  end if;
  update public.orders set status = p_status where id = v_o.id;
  insert into public.order_status_history(order_id, status, changed_by) values (v_o.id, p_status, v_uid);
end; $function$;