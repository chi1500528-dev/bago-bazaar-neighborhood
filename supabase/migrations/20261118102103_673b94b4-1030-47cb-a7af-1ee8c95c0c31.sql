create table public.wishlist_items (
  user_id uuid not null,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
grant select, insert, delete on public.wishlist_items to authenticated;
grant all on public.wishlist_items to service_role;
alter table public.wishlist_items enable row level security;
create policy "Own wishlist read" on public.wishlist_items for select to authenticated using (user_id = auth.uid());
create policy "Own wishlist add" on public.wishlist_items for insert to authenticated with check (user_id = auth.uid());
create policy "Own wishlist remove" on public.wishlist_items for delete to authenticated using (user_id = auth.uid());

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text,
  recipient_name text not null,
  phone text not null,
  township_id uuid references public.townships(id),
  address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses(user_id);
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "Own addresses read" on public.addresses for select to authenticated using (user_id = auth.uid());
create policy "Own addresses add" on public.addresses for insert to authenticated with check (user_id = auth.uid());
create policy "Own addresses edit" on public.addresses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Own addresses remove" on public.addresses for delete to authenticated using (user_id = auth.uid());
create trigger addresses_updated_at before update on public.addresses for each row execute function public.update_updated_at_column();