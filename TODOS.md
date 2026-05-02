# TODOS.md

Bu dosya her branch'te plani kucuk, uygulanabilir ve dogrulanabilir adimlara bolmek icin kullanilir.

## Completed Todos (Previous Waves)

- [x] Complete the database, edge function, mobile MVP, scanner, admin, QA, push, hosted dry-run, support, theme/language, redesign foundation, business media upload, club mobile operations, and reward cover slider slices recorded in `PROGRESS.md`.

## Current Todos (Verified Technical Report Fixes)

- [x] Read `RAPOR.md` and compare findings against current code.
- [x] Add missing `/club` root Stack registration.
- [x] Add QR token usage SELECT RLS policies.
- [x] Restrict current business application inserts to authenticated users.
- [x] Add student registration cancellation RPC and mobile UI.
- [x] Remove unnecessary profile row lock from event registration.
- [x] Refresh leaderboard after successful scans.
- [x] Count successful push deliveries correctly.
- [x] Parallelize scheduled leaderboard refresh.
- [x] Rename QR token query key parameter semantics.
- [x] Run available validation commands and record the local Supabase lint blocker.
- [x] Update `PROGRESS.md` with verified findings and handoff.
- [ ] Commit, push, merge to `main`, push `main`, and delete the bug-fix branch.

## Next Queue

- [ ] Design scanner location consent and fraud scoring slice.
- [ ] Design public business application captcha/rate-limit/API slice before exposing self-serve onboarding.
- [ ] Design platform and organizer announcement model with push opt-in and read receipts.
- [ ] Design typed event rules builder for leima quotas and venue-specific stamp limits.
- [ ] Plan session/admin performance cleanup.
