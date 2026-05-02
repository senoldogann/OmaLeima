# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `bug/verify-technical-report-findings`
- **Goal:** Confirm `RAPOR.md` findings, fix the verified correctness/security issues, and preserve deferred product/security work as ordered follow-up.

## Architectural Decisions

- Add `/club` to the root mobile Stack instead of relying on implicit Expo Router behavior.
- Add RLS SELECT policies for `qr_token_uses` covering platform admins, event managers, and the involved business staff.
- Replace anonymous business application insert policy with authenticated insert for the current non-public application workflow.
- Add `cancel_event_registration_atomic` with actor checks, status checks, row locking, and audit logging.
- Wire student event detail to the cancel RPC and invalidate the same event/reward query families as join.
- Remove the unnecessary `profiles for update` lock in `register_event_atomic`.
- Refresh event leaderboard immediately after a successful scan and keep scheduled refresh as catch-up.
- Run scheduled leaderboard refresh with `Promise.allSettled` so one slow event does not block all others.
- Count successful push deliveries per device token, not as a boolean.
- Rename the QR token query key argument so the access-token cache key is explicit.

## Alternatives Considered

- Add scanner GPS now:
  - rejected because it needs permission copy, denial states, consent, privacy policy alignment, and platform QA.
- Keep business applications anonymous:
  - rejected for the current private pilot because there is no public application UX yet and anon insert creates spam exposure.
- Remove future leaderboard scopes:
  - rejected because the schema intentionally keeps future scopes and current reads filter EVENT.
- Extend broadcast notification policy now:
  - rejected because platform and organizer announcements need audience targeting, read receipts, and opt-in semantics.

## Edge Cases

- Cancel should only work for the owning student or service role.
- Cancel should not work after the event starts or after the event becomes ACTIVE/COMPLETED/CANCELLED.
- BANNED registrations must not be silently converted to CANCELLED.
- Registering after cancellation should still reactivate the row through the existing register RPC.
- QR audit reads must not expose rows to unrelated users.
- Push persistence should mark notification SENT if at least one token succeeded, while storing all per-token results.
- Typecheck, lint, export, and SQL migration validation must pass where available.

## Ordered Follow-Up Queue

1. Scanner location consent slice: permission UX, privacy copy, denied-state UI, and server-side fraud scoring.
2. Public business application hardening if self-serve venue onboarding is opened: captcha, rate limit, email verification, and route-owned insert API.
3. Announcement/broadcast model: platform and organizer announcements, audience targeting, read receipts, notification opt-in, and RLS.
4. Event rules schema builder: typed JSON rules for leima quota, per-venue stamp limits, task/purchase requirements, and pass-return workflows.
5. Performance cleanup: session access waterfall and admin helper-query optimization.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `supabase db lint`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
