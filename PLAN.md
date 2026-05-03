# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/typed-event-rules-builder`
- **Goal:** Give organizers a typed stamp policy builder and make scan enforcement follow that policy.

## Architectural Decisions

- Introduce a typed `stampPolicy` JSON shape under `events.rules`.
- Start with the operationally important rule: `stampPolicy.perBusinessLimit`.
- Preserve current behavior by defaulting the limit to `1`.
- Replace the raw rules JSON textarea with a small rules builder on create/update forms.
- Drop the same-business unique constraint and enforce the configured limit in `scan_stamp_atomic`.
- Keep QR replay protection through existing QR JTI constraints.

## Edge Cases

- Missing rules or invalid policy: scanner uses limit `1`.
- Limit less than `1`: validation rejects in admin UI and backend helper clamps to `1`.
- Limit greater than `5`: validation rejects in admin UI and backend helper caps to a safe upper bound.
- Concurrent scans for the same student/event: existing registration row lock serializes the count check.
- QR replay: existing `qr_token_uses` primary key and `stamps.qr_jti` uniqueness still reject reused tokens.

## Ordered Follow-Up Queue

1. Add announcement/push opt-in/read-receipt model.
2. Add scanner PIN reset audit review in admin/club tools if operators need central oversight.
3. Add richer fraud filters once real pilot data shows signal volume.
4. Expand the rules builder with venue groups or task-based rasti requirements after pilot feedback.

## Validation Plan

- Run:
  - `npx supabase@2.95.4 db push --yes`
  - `npx supabase@2.95.4 db lint --linked`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run build`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
