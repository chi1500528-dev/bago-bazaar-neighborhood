-- Delivery cost depends on distance and is agreed in person; no fixed fee is charged.
update public.shops set delivery_fee = 0 where delivery_fee <> 0;
alter table public.shops add constraint shops_no_fixed_delivery_fee check (delivery_fee = 0);
