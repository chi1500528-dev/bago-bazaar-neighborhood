-- PENDING — NOT APPLIED. Milestone A: shop reports + receipt settings.
-- Review, then apply once (preview and live share one production database).
-- Safe to re-run: every statement is idempotent.

-- 1. Receipt settings on shops (metadata-only column add; no row rewrite).
alter table public.shops add column if not exists receipt_settings jsonb not null default '{}'::jsonb;
do $$ begin
  alter table public.shops add constraint shops_receipt_settings_shape
    check (jsonb_typeof(receipt_settings) = 'object' and pg_column_size(receipt_settings) < 4096);
exception when duplicate_object then null; end $$;

-- 2. In-store POS report. Yangon dates: [start 00:00, (end+1) 00:00).
create or replace function public.pos_report_range(p_shop_id uuid, p_start date, p_end date)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_from timestamptz; v_to timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_shop_id is null or not (public.is_shop_owner(p_shop_id) or public.has_role(auth.uid(),'admin')) then raise exception 'FORBIDDEN'; end if;
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 366 then raise exception 'INVALID_RANGE'; end if;
  v_from := p_start::timestamp at time zone 'Asia/Yangon';
  v_to   := (p_end + 1)::timestamp at time zone 'Asia/Yangon';
  return (
    with s as (
      select * from public.pos_sales where shop_id = p_shop_id and created_at >= v_from and created_at < v_to
    ), c as (select * from s where status = 'completed'), v as (select * from s where status = 'voided')
    select jsonb_build_object(
      'start', p_start, 'end', p_end,
      'completed_total', coalesce((select sum(total) from c), 0),
      'completed_count', (select count(*) from c),
      'by_method', jsonb_build_object(
        'cash',   coalesce((select sum(total) from c where payment_method = 'cash'), 0),
        'kbzpay', coalesce((select sum(total) from c where payment_method = 'kbzpay'), 0),
        'wave',   coalesce((select sum(total) from c where payment_method = 'wave'), 0),
        'other',  coalesce((select sum(total) from c where payment_method = 'other'), 0)),
      'voided_count', (select count(*) from v),
      'voided_value', coalesce((select sum(total) from v), 0),
      'top_products', coalesce((select jsonb_agg(x order by x->>'qty' desc) from (
          select jsonb_build_object('name', i.name, 'qty', sum(i.quantity), 'total', sum(i.line_total)) x
          from public.pos_sale_items i join c on c.id = i.sale_id
          group by i.name order by sum(i.quantity) desc, sum(i.line_total) desc limit 10) t), '[]'::jsonb),
      'sales', coalesce((select jsonb_agg(jsonb_build_object('sale_number', sale_number, 'created_at', created_at, 'status', status,
          'payment_method', payment_method, 'total', total, 'void_reason', void_reason) order by created_at desc)
          from (select * from s order by created_at desc limit 5000) l), '[]'::jsonb)
    ));
end $$;

-- 3. Marketplace report. Completed orders are dated by when they were marked completed;
--    in-progress / cancelled counts are dated by when the order was placed.
--    No recipient name, phone or address is returned.
create or replace function public.orders_report_range(p_shop_id uuid, p_start date, p_end date)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_from timestamptz; v_to timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_shop_id is null or not (public.is_shop_owner(p_shop_id) or public.has_role(auth.uid(),'admin')) then raise exception 'FORBIDDEN'; end if;
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 366 then raise exception 'INVALID_RANGE'; end if;
  v_from := p_start::timestamp at time zone 'Asia/Yangon';
  v_to   := (p_end + 1)::timestamp at time zone 'Asia/Yangon';
  return (
    with done as (
      select o.*, coalesce((select max(h.created_at) from public.order_status_history h where h.order_id = o.id and h.status = 'completed'), o.updated_at) as done_at
      from public.orders o where o.shop_id = p_shop_id and o.status = 'completed'
    ), c as (select * from done where done_at >= v_from and done_at < v_to),
    placed as (select * from public.orders where shop_id = p_shop_id and status <> 'completed' and created_at >= v_from and created_at < v_to)
    select jsonb_build_object(
      'start', p_start, 'end', p_end,
      'completed_count', (select count(*) from c),
      'merchandise_subtotal', coalesce((select sum(subtotal) from c), 0),
      'delivery_fees', coalesce((select sum(delivery_fee) from c), 0),
      'completed_value', coalesce((select sum(total) from c), 0),
      'pipeline', coalesce((select jsonb_object_agg(status, jsonb_build_object('count', n, 'subtotal', st)) from (
          select status::text, count(*) n, sum(subtotal) st from placed group by status) p), '{}'::jsonb),
      'top_products', coalesce((select jsonb_agg(x order by x->>'qty' desc) from (
          select jsonb_build_object('name', i.name, 'qty', sum(i.quantity), 'total', sum(i.line_total)) x
          from public.order_items i join c on c.id = i.order_id
          group by i.name order by sum(i.quantity) desc, sum(i.line_total) desc limit 10) t), '[]'::jsonb),
      'orders', coalesce((select jsonb_agg(r order by r->>'at' desc) from (
          select jsonb_build_object('order_no', o.order_no, 'at', o.at, 'status', o.status, 'township', tw.name_en,
            'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee, 'total', o.total) r
          from (select id, order_no, done_at at, status::text status, township_id, subtotal, delivery_fee, total from c
                union all
                select id, order_no, created_at, status::text, township_id, subtotal, delivery_fee, total from placed where status = 'cancelled') o
          left join public.townships tw on tw.id = o.township_id
          order by o.at desc limit 5000) l), '[]'::jsonb)
    ));
end $$;

revoke execute on function public.pos_report_range(uuid, date, date) from public, anon;
revoke execute on function public.orders_report_range(uuid, date, date) from public, anon;
grant execute on function public.pos_report_range(uuid, date, date) to authenticated;
grant execute on function public.orders_report_range(uuid, date, date) to authenticated;
