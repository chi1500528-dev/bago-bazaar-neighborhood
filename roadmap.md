# Roadmap

## Current state

- [x] Milestone 1 — product onboarding (SKU/barcode, validation, draft description, CSV import + safe re-import, import history, template picker) and latest CSV safety fixes: implemented.
  - [ ] Owner testing in Preview — pending.
- [ ] Starter catalog / template content — waiting for review by local Burmese-speaking shop owners. Not seeded.
- [x] Milestone 2 — small in-store POS and shared stock ledger: code implemented; database objects are present in Supabase.
  - [ ] Signed-in end-to-end testing — pending.
  - [x] VPS deployment — done (VPS updated).

- [x] Owner daily overview: separate In-store / Online today cards (Yangon day), low-stock filter, order status filters.
  - [ ] Signed-in owner check in Preview — pending (owner).
- Delivery fee stays 0 on shop save (owner decision).

- [x] Phase 3 (approved, built and live on the VPS): stock receiving, corrections, cost snapshots, profit report.
  - [x] Pure rules + tests.
  - [x] Database Part A applied (approved).
  - [x] Screens: Receive stock, Correct count, Set cost, profit section in Reports; CSV stock changes use corrections.
  - [ ] Signed-in owner check in Preview — pending (owner).
  - [x] Part B stock-typing block — applied 2026-11-19 after the VPS was updated (owner approved).

## Future candidates (not approved for build)

Phase 4 is a future candidate to validate with Bago shop owners first. It is not current build approval and has no dates. (Phase 3 is done — see above.)

### Phase 4 — Shop team and optional device support

- Staff accounts with a small set of roles and owner-controlled permissions, if shops ask for them.
- Returns/exchanges with item-level quantities and explicit restock/refund handling; no payment processing unless a supported provider is chosen.
- Printer/scanner compatibility based on devices shop owners actually use; browser printing and keyboard-emulating scanners remain the baseline.
- Offline selling considered only after measuring need and defining conflict-safe stock sync.
- Not committed: offline mode, cash drawer hardware, payment gateway integration.
