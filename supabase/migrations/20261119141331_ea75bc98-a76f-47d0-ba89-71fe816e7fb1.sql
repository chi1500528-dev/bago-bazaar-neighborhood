create index if not exists product_costs_shop_id_idx on public.product_costs(shop_id);
create index if not exists sale_line_costs_shop_id_idx on public.sale_line_costs(shop_id);
create index if not exists stock_adjustments_product_id_idx on public.stock_adjustments(product_id);
create index if not exists stock_receipts_product_id_idx on public.stock_receipts(product_id);