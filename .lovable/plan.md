# Release B preflight result (read-only) — next step: apply pending SQL

## Preflight findings (2026-11-18, read-only)
- Products: 5. Stock below 0: 0. Price 0 or less: 0 (also 0 active, 0 with effective sale price 0 or less).
- Required existing tables present: products, shops, orders, order_items, order_status_history. Products has name, price, sale_price, stock, sku, barcode.
- Required existing functions present: place_order, update_order_status, is_shop_owner, has_role, products_validate, update_updated_at_column.
- Release B objects not yet present: stock_movements, pos_sales, pos_sale_items, pos_counters, pos_checkout, pos_void_sale, pos_day, products_stock_ledger.
- VPS link: the public files served by bagomarket.shop and vps.bagomarket.shop name this same Supabase project. The relay on both answers in the Supabase format (401 "No API key" without a key). The server-only settings on the VPS cannot be read from here; confirm on the VPS that SUPABASE_URL contains the same project ID (compare names only, never print keys).

## Proposed next step (only after approval)
1. Apply `supabase/pending/20261118_release_b_pos_stock_ledger.sql` unchanged through the migration tool. Effect on the live site: new sales and stock-history records, 5 opening-balance entries, and updated online order/cancel functions (same inputs and outputs).
2. Re-run read-only checks: 5 opening-balance rows, the new functions exist, stock unchanged.
3. Test in Preview with a test product; no VPS update until you approve.
