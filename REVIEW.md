# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/reward-unlocked-remote-push-delivery-and-device-smoke`
- **Scope:** Add the smallest honest backend reward-unlocked remote push delivery on top of the shipped local notification and Realtime foundations, with deterministic smoke coverage and no broad UI work.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `supabase/migrations/20260427181000_scan_stamp_atomic.sql`
- `supabase/migrations/20260429113000_scan_stamp_atomic_reward_unlocks.sql`
- `supabase/functions/scan-qr/index.ts`
- `supabase/functions/_shared/expoPush.ts`
- `apps/admin/scripts/_shared/function-smoke.ts`
- `apps/admin/scripts/smoke-reward-unlocked-push.ts`
- `apps/admin/package.json`
- `package.json`
- `tests/run-reward-unlocked-push-readiness.mjs`
- `apps/mobile/README.md`
- `LEIMA_APP_MASTER_PLAN.md`
- `docs/EDGE_FUNCTIONS.md`
- `docs/TESTING.md`

## Risks

- Scan success must stay truthful even if reward-unlocked push delivery fails after the stamp was already written. Returning a hard transport error here would make scanner retries dangerous.
- Reward unlock delivery must not resend the same tier on later stamp scans. The unlock boundary has to be tied to the atomic stamp write, not to broad "currently claimable" reads.
- Local smoke needs deterministic Expo push behavior. The project already points `EXPO_PUSH_API_URL` to `host.docker.internal`, so the script has to own a host-side mock server cleanly.
- This slice must stay focused on backend delivery and validation. The user explicitly said the broader UI redesign will happen later.

## Dependencies

- Existing Expo push transport helper in `supabase/functions/_shared/expoPush.ts`.
- Current stamp atomic path in `public.scan_stamp_atomic`.
- Existing `notifications` table and delivery status conventions already used by promotion and reminder pushes.
- Mobile local reward notification bridge shipped in the previous slice.
- Expo push setup guidance that requires physical devices for real remote delivery verification.

## Existing Logic Checked

- `scan-qr` already delegates all stamp concurrency control to `scan_stamp_atomic`, so unlock detection should attach there instead of duplicating business logic in the function layer.
- Promotion and reminder pushes already batch Expo sends and persist `notifications` rows with `SENT` or `FAILED`.
- Mobile already registers Expo device tokens and already shows local foreground unlock notifications; remote reward-unlocked delivery is the missing half.
- The repository does not yet have a deterministic smoke for reward-unlocked push delivery or its duplicate-boundary behavior.

## Review Outcome

Build the smallest remote reward-unlocked delivery slice that:

- detects newly crossed reward thresholds inside the atomic stamp path
- attempts Expo push delivery after a successful scan without turning transport issues into fake scan failures
- persists honest `notifications` rows for shipped unlock pushes
- proves duplicate safety with a deterministic local smoke using the existing host mock push pattern
- keeps the broader notification center, stock-change remote push, and future UI pass out of scope
