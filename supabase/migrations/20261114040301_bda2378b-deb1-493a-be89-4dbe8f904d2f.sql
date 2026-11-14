create or replace function public.media_is_public(_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.products p where p.is_active and public.shop_is_public(p.shop_id) and _path = any(p.images))
  or exists (select 1 from public.shops s where s.status='approved' and s.is_active and (s.logo_url=_path or s.cover_url=_path))
  or exists (select 1 from public.categories c where c.is_active and c.image_url=_path)
  or exists (select 1 from public.promotions pr where pr.is_active and pr.image_url=_path)
  or exists (select 1 from public.order_items oi where oi.image_url=_path and public.can_view_order(oi.order_id))
$$;
drop policy if exists "media public read" on storage.objects;
create policy "media owner read" on storage.objects for select to authenticated
  using (bucket_id='media' and ((storage.foldername(name))[1] = (select auth.uid()::text) or public.has_role(auth.uid(),'admin')));
create policy "media published read" on storage.objects for select to anon, authenticated
  using (bucket_id='media' and public.media_is_public(name));