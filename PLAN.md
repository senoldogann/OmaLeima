# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/scanner-contract-hardening`
- **Goal:** Close the highest-signal scanner and QR contract gaps from the latest review without widening the slice into another UI pass.

## Architectural Decisions

- Treat the mobile business scanner as having a bounded status contract instead of accepting arbitrary backend error codes as scan results.
- Expand the scanner status union only for backend states that the scanner UI can intentionally present.
- Keep transport behavior strict: known scanner statuses map to a result card, unknown statuses raise a real error.
- Do not change HTTP semantics for `scan-qr` in this slice; only remove the dead branch and keep current `400` behavior.

## Alternatives Considered

- Leaving the drift in place because the scanner currently works in the happy path:
  - rejected because unsupported statuses can still leak through and make debugging harder later
- Expanding the scanner union to every generic backend error code:
  - rejected because `UNAUTHORIZED`, `VALIDATION_ERROR`, and `INTERNAL_ERROR` should stay exception paths, not normal scan results
- Reopening the broader mobile redesign immediately:
  - rejected because the user already said the full UI pass will happen later

## Edge Cases

- `INVALID_QR_TYPE` should become a first-class scanner result instead of falling through to a generic invalid QR title.
- `NOT_BUSINESS_STAFF` and `BUSINESS_CONTEXT_REQUIRED` can still happen under stale sessions or tampered requests and should stay understandable in the scanner UI.
- Unknown future backend error codes should not silently inherit a neutral tone through a loose cast.

## Validation Plan

- Re-run `apps/mobile` lint and typecheck for the scanner contract changes.
- Re-run the existing `apps/admin` QR security smoke so the backend branch cleanup stays covered by real function behavior.
- Update handoff docs to note that the large UI redo is intentionally deferred while scanner hardening continues in small slices.
