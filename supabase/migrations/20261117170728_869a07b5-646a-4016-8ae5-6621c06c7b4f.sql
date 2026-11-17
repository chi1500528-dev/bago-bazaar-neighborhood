create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select _user_id is not null and _user_id = auth.uid()
    and exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
alter table public.product_imports add column if not exists failed integer not null default 0;