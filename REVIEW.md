# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `bug/verify-technical-report-findings`
- **Scope:** Verify `RAPOR.md` findings against current code, fix confirmed low-risk defects, and record larger follow-up items without losing them.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/features/events/student-event-detail.ts`
- `apps/mobile/src/features/events/types.ts`
- `apps/mobile/src/features/qr/student-qr.ts`
- `supabase/functions/scan-qr/index.ts`
- `supabase/functions/scheduled-leaderboard-refresh/index.ts`
- `supabase/migrations/20260503103000_report_verified_integrity_fixes.sql`

## Verified Findings

- **C-1 partially true:** student registration cancellation is missing from backend and mobile UI. It is a product-critical flow, but not a production crash.
- **C-2 true:** `/club` is missing from the root mobile Stack.
- **C-3 true:** `qr_token_uses` has RLS enabled but no SELECT policies.
- **C-4 true as abuse risk:** anonymous `business_applications` insert is too open for the current app, where no public self-serve venue application flow exists yet.
- **H-1 true:** `scan_stamp_atomic` does not refresh the leaderboard after a successful stamp.
- **H-3 true as naming/maintenance bug:** QR token query key labels the second value as `studentId` but passes an access token.
- **M-1 true:** `register_event_atomic` locks `profiles` despite only reading the row.
- **M-2 true:** scan push notification persistence records any successful device delivery as `1`, not the actual successful device count.
- **M-3 true:** scheduled leaderboard refresh processes dirty events sequentially.

## Deferred Findings

- **H-2 scanner location:** true, but location capture needs a consent/privacy UX and permission handling slice. Sending device location silently would be worse than the current explicit `null`.
- **M-4 leaderboard scopes:** schema supports future scopes; no current UI depends on weekly/monthly/yearly.
- **M-5 admin helper query cost:** possible optimization, but not a correctness bug.
- **L-1 QR timing:** tune only after real event-day latency data.
- **L-2 session error string matching:** low-priority admin hardening.
- **L-3 broadcast notifications:** future announcement/broadcast feature needs a full audience/read-receipt model.
- **L-4 event rules JSON schema:** valid roadmap item for organizer event-rule builder.
- **L-5 migration window:** historical migration-order risk, not useful to patch retroactively without rebuilding migration history.
- **L-6 session waterfall:** performance cleanup, not part of this bug-fix branch.

## Risks

- Replacing SQL functions must preserve existing auth checks, status codes, unique-constraint behavior, and audit trails.
- Refreshing leaderboard inside scan increases scan work; keep scheduler as a backup and make scheduler parallel for catch-up.
- Restricting business application inserts to authenticated users is safe for current app flows, but a future public venue application page will need captcha/rate limiting and a dedicated API.
- This branch must not stage the user-owned `apps/mobile/package.json` script changes, `RAPOR.md`, or `.idea/` metadata.

## Review Outcome

Patch the confirmed defects that have clear root-cause fixes now. Queue the privacy/product-dependent findings as explicit next steps instead of mixing them into this security/integrity pass.
