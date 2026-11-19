# Phase 3 — Proposed database changes (for review only)

**Status: not applied, not staged as a migration.** This document is for reading only. Nothing here runs until you approve it. Preview and the live VPS share one database.

## Plain-language summary
| What | Who can see it | Who can change it |
|---|---|---|
| Product cost (new, separate table) | Shop owner, admin | Only "Receive stock" or "Set cost" |
| Stock received records (new) | Shop owner, admin | Only "Receive stock" |
| Count corrections (new) | Shop owner, admin | Only "Correct count" |
| Cost saved on each sold line (new) | Shop owner, admin | Saved automatically at sale; never edited |
| Stock number on products | unchanged | Only through Receive, Correct, sales, cancels and voids; typing it directly is refused |

- Customers and signed-out visitors can't read any cost.
- Existing product, order and POS tables keep their current access rules.
- Checkout and POS functions are **not rewritten**; the cost is copied by a small automatic step when a sale line is saved.
- No existing data is changed or deleted. Past sales stay "cost unknown".

## Affected app code (moved to the new functions before the stock guard is switched on)
- Product form: the stock box becomes read-only, with "Receive stock" and "Correct count" buttons.
- CSV re-import: stock changes go through `adjust_stock` with reason `import`.
- New products (form, CSV, template) still set opening stock on create — allowed.

## Rollout order (each step reviewed)
1. Part A: tables, functions, cost snapshot triggers, report. Harmless to the current app.
2. Update app code (preview, then VPS).
3. Part B: stock guard. Only after the VPS runs the new code; old code that types stock would be refused.

---

## Part A — SQL
```sql
-- 1. Ledger: new reasons, optional note and unit cost
alter table public.stock_movements drop constraint if exists stock_movements_reason_check;
alter table public.stock_movements add constraint stock_movements_reason_check check (reason in
  ('opening_balance','new_product','manual_edit','online_order','order_cancelled','pos_sale','pos_void','stock_received','stock_adjusted'));
alter table public.stock_movements add column if not exists note text, add column if not exists unit_cost integer;

create or replace function public.products_stock_ledger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_reason text := nullif(current_setting('bm.stock_reason', true), '');
  v_ref text := nullif(current_setting('bm.stock_ref', true), '');
  v_note text := nullif(current_setting('bm.stock_note', true), '');
  v_cost text := nullif(current_setting('bm.stock_cost', true), '');
  v_delta int;
begin
  if tg_op = 'INSERT' then
    if new.stock = 0 then return new; end if;
    v_delta := new.stock; v_reason := coalesce(v_reason, 'new_product');
  else
    if new.stock = old.stock then return new; end if;
    v_delta := new.stock - old.stock; v_reason := coalesce(v_reason, 'manual_edit');
  end if;
  insert into public.stock_movements(shop_id, product_id, product_name, sku, barcode, delta, stock_after, reason, ref_type, ref_id, created_by, note, unit_cost)
  values (new.shop_id, new.id, new.name, new.sku, new.barcode, v_delta, new.stock, v_reason,
    case v_reason when 'online_order' then 'order' when 'order_cancelled' then 'order' when 'pos_sale' then 'pos_sale'
      when 'pos_void' then 'pos_sale' when 'stock_received' then 'stock_receipt' when 'stock_adjusted' then 'stock_adjustment' else null end,
    case when v_ref is null then null else v_ref::uuid end, auth.uid(), v_note, case when v_cost is null then null else v_cost::int end);
  return new;
end $$;

-- 2. Current product cost (owner-only, nullable = unknown)
create table public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  cost_price integer,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
grant select on public.product_costs to authenticated;
grant all on public.product_costs to service_role;
alter table public.product_costs enable row level security;
create policy "Owners and admins read costs" on public.product_costs for select to authenticated
  using (public.is_shop_owner(shop_id) or public.has_role(auth.uid(),'admin'));

-- 3. Stock received records
create table public.stock_receipts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity between 1 and 99999),
  unit_cost integer check (unit_cost is null or unit_cost between 0 and 100000000),
  supplier text check (supplier is null or length(supplier) <= 80),
  reference text check (reference is null or length(reference) <= 60),
  idempotency_key text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (shop_id, idempotency_key)
);
grant select on public.stock_receipts to authenticated;
grant all on public.stock_receipts to service_role;
alter table public.stock_receipts enable row level security;
create policy "Owners and admins read receipts" on public.stock_receipts for select to authenticated
  using (public.is_shop_owner(shop_id) or public.has_role(auth.uid(),'admin'));

-- 4. Count corrections
create table public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  old_count integer not null,
  new_count integer not null check (new_count between 0 and 999999),
  reason text not null check (reason in ('count_correction','damaged','expired','lost','other','import')),
  note text check (note is null or length(note) <= 200),
  idempotency_key text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (shop_id, idempotency_key)
);
grant select on public.stock_adjustments to authenticated;
grant all on public.stock_adjustments to service_role;
alter table public.stock_adjustments enable row level security;
create policy "Owners and admins read adjustments" on public.stock_adjustments for select to authenticated
  using (public.is_shop_owner(shop_id) or public.has_role(auth.uid(),'admin'));

-- 5. Cost saved per sold line (owner-only; customers can't read it)
create table public.sale_line_costs (
  line_type text not null check (line_type in ('pos','order')),
  line_id uuid not null,
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid,
  quantity integer not null,
  unit_cost integer,           -- null = unknown at time of sale
  created_at timestamptz not null default now(),
  primary key (line_type, line_id)
);
grant select on public.sale_line_costs to authenticated;
grant all on public.sale_line_costs to service_role;
alter table public.sale_line_costs enable row level security;
create policy "Owners and admins read line costs" on public.sale_line_costs for select to authenticated
  using (public.is_shop_owner(shop_id) or public.has_role(auth.uid(),'admin'));

create or replace function public.snapshot_line_cost() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_shop uuid;
begin
  if tg_table_name = 'pos_sale_items' then select shop_id into v_shop from public.pos_sales where id = new.sale_id;
  else select shop_id into v_shop from public.orders where id = new.order_id; end if;
  insert into public.sale_line_costs(line_type, line_id, shop_id, product_id, quantity, unit_cost)
  values (case when tg_table_name = 'pos_sale_items' then 'pos' else 'order' end, new.id, v_shop, new.product_id, new.quantity,
    (select cost_price from public.product_costs where product_id = new.product_id))
  on conflict do nothing;
  return new;
end $$;
create trigger pos_sale_items_cost_trg after insert on public.pos_sale_items for each row execute function public.snapshot_line_cost();
create trigger order_items_cost_trg after insert on public.order_items for each row execute function public.snapshot_line_cost();

-- 6. Receive stock (idempotent)
create or replace function public.receive_stock(p_product_id uuid, p_qty integer, p_unit_cost integer,
  p_supplier text, p_reference text, p_idempotency_key text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_p public.products%rowtype; v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_KEY'; end if;
  select * into v_p from public.products where id = p_product_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not (public.is_shop_owner(v_p.shop_id) or public.has_role(v_uid,'admin')) then raise exception 'FORBIDDEN'; end if;
  select id into v_id from public.stock_receipts where shop_id = v_p.shop_id and idempotency_key = p_idempotency_key;
  if v_id is not null then return v_id; end if;
  if p_qty is null or p_qty < 1 or p_qty > 99999 then raise exception 'INVALID_QUANTITY'; end if;
  if p_unit_cost is not null and (p_unit_cost < 0 or p_unit_cost > 100000000) then raise exception 'INVALID_COST'; end if;
  insert into public.stock_receipts(shop_id, product_id, product_name, quantity, unit_cost, supplier, reference, idempotency_key, created_by)
  values (v_p.shop_id, v_p.id, v_p.name, p_qty, p_unit_cost, nullif(btrim(coalesce(p_supplier,'')),''), nullif(btrim(coalesce(p_reference,'')),''), p_idempotency_key, v_uid)
  returning id into v_id;
  perform set_config('bm.stock_reason','stock_received',true);
  perform set_config('bm.stock_ref', v_id::text, true);
  perform set_config('bm.stock_cost', coalesce(p_unit_cost::text,''), true);
  update public.products set stock = stock + p_qty where id = v_p.id;
  perform set_config('bm.stock_reason','',true); perform set_config('bm.stock_ref','',true); perform set_config('bm.stock_cost','',true);
  if p_unit_cost is not null then
    insert into public.product_costs(product_id, shop_id, cost_price, updated_by) values (v_p.id, v_p.shop_id, p_unit_cost, v_uid)
    on conflict (product_id) do update set cost_price = excluded.cost_price, updated_at = now(), updated_by = v_uid;
  end if;
  return v_id;
end $$;

-- 7. Correct count (idempotent, reason required)
create or replace function public.adjust_stock(p_product_id uuid, p_new_count integer, p_reason text, p_note text, p_idempotency_key text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_p public.products%rowtype; v_id uuid; v_note text := nullif(btrim(coalesce(p_note,'')),'');
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_KEY'; end if;
  select * into v_p from public.products where id = p_product_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not (public.is_shop_owner(v_p.shop_id) or public.has_role(v_uid,'admin')) then raise exception 'FORBIDDEN'; end if;
  select id into v_id from public.stock_adjustments where shop_id = v_p.shop_id and idempotency_key = p_idempotency_key;
  if v_id is not null then return v_id; end if;
  if p_reason is null or p_reason not in ('count_correction','damaged','expired','lost','other','import') then raise exception 'REASON_REQUIRED'; end if;
  if p_reason = 'other' and v_note is null then raise exception 'NOTE_REQUIRED'; end if;
  if p_new_count is null or p_new_count < 0 or p_new_count > 999999 then raise exception 'INVALID_QUANTITY'; end if;
  if p_new_count = v_p.stock then raise exception 'NO_CHANGE'; end if;
  insert into public.stock_adjustments(shop_id, product_id, product_name, old_count, new_count, reason, note, idempotency_key, created_by)
  values (v_p.shop_id, v_p.id, v_p.name, v_p.stock, p_new_count, p_reason, left(v_note,200), p_idempotency_key, v_uid) returning id into v_id;
  perform set_config('bm.stock_reason','stock_adjusted',true);
  perform set_config('bm.stock_ref', v_id::text, true);
  perform set_config('bm.stock_note', p_reason || coalesce(': ' || left(v_note,200), ''), true);
  update public.products set stock = p_new_count where id = v_p.id;
  perform set_config('bm.stock_reason','',true); perform set_config('bm.stock_ref','',true); perform set_config('bm.stock_note','',true);
  return v_id;
end $$;

-- 8. Set or clear current cost without receiving stock (affects future sales only)
create or replace function public.set_product_cost(p_product_id uuid, p_cost integer) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_shop uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select shop_id into v_shop from public.products where id = p_product_id;
  if v_shop is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_shop_owner(v_shop) or public.has_role(v_uid,'admin')) then raise exception 'FORBIDDEN'; end if;
  if p_cost is not null and (p_cost < 0 or p_cost > 100000000) then raise exception 'INVALID_COST'; end if;
  insert into public.product_costs(product_id, shop_id, cost_price, updated_by) values (p_product_id, v_shop, p_cost, v_uid)
  on conflict (product_id) do update set cost_price = excluded.cost_price, updated_at = now(), updated_by = v_uid;
end $$;

-- 9. Profit report (read-only; Yangon half-open days; POS and online kept separate; no net profit)
create or replace function public.profit_report_range(p_shop_id uuid, p_start date, p_end date) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_from timestamptz; v_to timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_shop_id is null or not (public.is_shop_owner(p_shop_id) or public.has_role(auth.uid(),'admin')) then raise exception 'FORBIDDEN'; end if;
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 366 then raise exception 'INVALID_RANGE'; end if;
  v_from := p_start::timestamp at time zone 'Asia/Yangon';
  v_to   := (p_end + 1)::timestamp at time zone 'Asia/Yangon';
  return (
    with pos_lines as (
      select i.line_total, c.unit_cost, i.quantity from public.pos_sale_items i
      join public.pos_sales s on s.id = i.sale_id and s.shop_id = p_shop_id and s.status = 'completed' and s.created_at >= v_from and s.created_at < v_to
      left join public.sale_line_costs c on c.line_type = 'pos' and c.line_id = i.id
    ), done as (
      select o.id from public.orders o where o.shop_id = p_shop_id and o.status = 'completed'
        and coalesce((select max(h.created_at) from public.order_status_history h where h.order_id = o.id and h.status = 'completed'), o.updated_at) >= v_from
        and coalesce((select max(h.created_at) from public.order_status_history h where h.order_id = o.id and h.status = 'completed'), o.updated_at) < v_to
    ), ord_lines as (
      select i.line_total, c.unit_cost, i.quantity from public.order_items i join done d on d.id = i.order_id
      left join public.sale_line_costs c on c.line_type = 'order' and c.line_id = i.id
    )
    select jsonb_build_object('start', p_start, 'end', p_end,
      'pos', (select jsonb_build_object('sales', coalesce(sum(line_total),0),
        'known_cost_sales', coalesce(sum(line_total) filter (where unit_cost is not null),0),
        'known_cost', coalesce(sum(unit_cost::bigint * quantity) filter (where unit_cost is not null),0),
        'unknown_cost_sales', coalesce(sum(line_total) filter (where unit_cost is null),0),
        'unknown_lines', count(*) filter (where unit_cost is null)) from pos_lines),
      'online', (select jsonb_build_object('sales', coalesce(sum(line_total),0),
        'known_cost_sales', coalesce(sum(line_total) filter (where unit_cost is not null),0),
        'known_cost', coalesce(sum(unit_cost::bigint * quantity) filter (where unit_cost is not null),0),
        'unknown_cost_sales', coalesce(sum(line_total) filter (where unit_cost is null),0),
        'unknown_lines', count(*) filter (where unit_cost is null)) from ord_lines))
  );
end $$;

-- 10. Who may call: signed-in users only; each function checks owner/admin itself
revoke all on function public.receive_stock(uuid,integer,integer,text,text,text) from public, anon;
revoke all on function public.adjust_stock(uuid,integer,text,text,text) from public, anon;
revoke all on function public.set_product_cost(uuid,integer) from public, anon;
revoke all on function public.profit_report_range(uuid,date,date) from public, anon;
revoke all on function public.snapshot_line_cost() from public, anon, authenticated;
grant execute on function public.receive_stock(uuid,integer,integer,text,text,text) to authenticated;
grant execute on function public.adjust_stock(uuid,integer,text,text,text) to authenticated;
grant execute on function public.set_product_cost(uuid,integer) to authenticated;
grant execute on function public.profit_report_range(uuid,date,date) to authenticated;
```

## Part B — Stock guard (apply only after the VPS runs the new app code)
```sql
create or replace function public.products_stock_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.stock is distinct from old.stock and coalesce(current_setting('bm.stock_reason', true), '') = '' then
    raise exception 'STOCK_DIRECT_EDIT';
  end if;
  return new;
end $$;
create trigger products_stock_guard_trg before update on public.products for each row execute function public.products_stock_guard();
```
Existing order, cancel, POS and void functions already set `bm.stock_reason`, so they keep working.

## Risks
- **Part B too early:** old app code (including the VPS) that saves the product form would get "STOCK_DIRECT_EDIT" on stock changes. That is why Part B goes last.
- **Cost triggers on sale lines:** they run inside checkout and POS. If one failed, the sale would fail too. They only read one row and insert one row, and are tested on preview first.
- **Report speed:** the completion-date lookup is the same as the existing online report, so it is fine for small shops.

## Undo
- **Part B:** `drop trigger products_stock_guard_trg on public.products; drop function public.products_stock_guard();`
- **Part A:**
  - Drop the two cost triggers and the five new functions.
  - Drop the tables `sale_line_costs`, `stock_adjustments`, `stock_receipts` and `product_costs`. This loses the cost and receipt records entered after applying.
  - Restore the previous `products_stock_ledger` and the reason check. Any rows with the new reasons must be kept, or re-labelled first.
