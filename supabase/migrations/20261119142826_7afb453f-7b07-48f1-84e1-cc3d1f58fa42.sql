create or replace function public.products_stock_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.stock is distinct from old.stock and coalesce(current_setting('bm.stock_reason', true), '') = '' then
    raise exception 'STOCK_DIRECT_EDIT';
  end if;
  return new;
end $$;
create trigger products_stock_guard_trg before update on public.products for each row execute function public.products_stock_guard();