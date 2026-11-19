# Roadmap

## Current state
- [x] Milestone 1 — product onboarding (SKU/barcode, validation, draft description, CSV import + safe re-import, import history, template picker) and latest CSV safety fixes: implemented.
  - [ ] Owner testing in Preview — pending.
- [ ] Starter catalog / template content — waiting for review by local Burmese-speaking shop owners. Not seeded.
- [x] Milestone 2 — small in-store POS and shared stock ledger: code implemented; database objects are present in Supabase.
  - [ ] Signed-in end-to-end testing — pending.
  - [ ] VPS deployment — pending (VPS not yet updated).

- [x] Owner daily overview: separate In-store / Online today cards (Yangon day), low-stock filter, order status filters.
  - [ ] Signed-in owner check in Preview — pending (owner).
- Delivery fee stays 0 on shop save (owner decision).

## Future candidates (not approved for build)
Phase 3 and Phase 4 are future candidates to validate with Bago shop owners first. They are not current build approval and have no dates.

### Phase 3 — Stock receiving and simple profit reports
- Simple purchase/restock flow: quantity received, unit cost, optional supplier/reference; increases stock through the same audited stock ledger.
- Stock-count corrections with a reason; low-stock list/reminder.
- Save cost snapshots for historical cost of goods; changing a product's later cost must not rewrite earlier sale profit.
- Daily/weekly/monthly summaries that separate sales revenue, cost of goods, gross profit, recorded expenses, and net operating profit (only when expense data is provided).
- Out of scope: full accounting, tax, payroll, complicated supplier management.

### Phase 4 — Shop team and optional device support
- Staff accounts with a small set of roles and owner-controlled permissions, if shops ask for them.
- Returns/exchanges with item-level quantities and explicit restock/refund handling; no payment processing unless a supported provider is chosen.
- Printer/scanner compatibility based on devices shop owners actually use; browser printing and keyboard-emulating scanners remain the baseline.
- Offline selling considered only after measuring need and defining conflict-safe stock sync.
- Not committed: offline mode, cash drawer hardware, payment gateway integration.
