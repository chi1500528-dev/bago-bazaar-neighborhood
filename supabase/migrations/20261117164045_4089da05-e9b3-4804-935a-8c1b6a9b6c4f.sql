create index if not exists product_imports_shop_idx on public.product_imports(shop_id);
drop policy "templates admin" on public.product_templates;
drop policy "templates read" on public.product_templates;
create policy "templates read" on public.product_templates for select to authenticated using (is_active or public.has_role(auth.uid(),'admin'));
create policy "templates admin insert" on public.product_templates for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "templates admin update" on public.product_templates for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "templates admin delete" on public.product_templates for delete to authenticated using (public.has_role(auth.uid(),'admin'));