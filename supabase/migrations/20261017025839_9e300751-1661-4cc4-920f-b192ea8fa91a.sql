
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.shops_guard() from public, anon, authenticated;
revoke execute on function public.can_view_order(uuid) from public, anon;
revoke execute on function public.is_shop_owner(uuid) from public, anon;
