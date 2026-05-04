# TODOS.md

Bu dosya her branch'te plani kucuk, uygulanabilir ve dogrulanabilir adimlara bolmek icin kullanilir.

## Completed Todos (Previous Waves)

- [x] Complete the database, edge function, mobile MVP, scanner, admin, QA, push, hosted dry-run, support, theme/language, redesign foundation, business media upload, club mobile operations, reward cover slider, verified report fixes, scanner policy, media fallback, business timeline, active event membership, media recovery, scanner duplicate UX, scanner kiosk polish, and mobile announcement feed route slices recorded in `PROGRESS.md`.

## Current Todos (Full Role Review Handoff)

- [x] Start a dedicated review handoff branch.
- [x] Re-check stale report findings against current files and migrations.
- [x] Verify native iOS permission strings exist in config and Info.plist.
- [x] Re-check physical iPhone availability through Xcode device listing.
- [x] Run admin typecheck and lint.
- [x] Run remote Supabase schema lint.
- [x] Update working docs with current evidence and blockers.
- [x] Run diff check.
- [ ] Commit, push, merge to `main`, push `main`, and delete the feature branch.

## Next Queue

- [ ] Physical iPhone native reinstall once devices are online in Xcode; verify `NSCameraUsageDescription` no longer appears.
- [ ] Physical iPhone smoke: scanner-only login opens camera directly, first scan succeeds, second scan shows already-recorded result, history updates.
- [ ] Physical iPhone smoke: upload organizer profile cover/logo, organizer event cover, and business profile cover/logo, then confirm non-zero public images render across student/business/club screens.
- [ ] Visual acceptance: business joined event slider/popup on physical iPhone.
- [ ] Finish full role review after physical smoke: screen necessity, visual clutter, RLS, media, event management, scanner, and QR flow.
