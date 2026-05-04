# TODOS.md

Bu dosya her branch'te plani kucuk, uygulanabilir ve dogrulanabilir adimlara bolmek icin kullanilir.

## Completed Todos (Previous Waves)

- [x] Complete the database, edge function, mobile MVP, scanner, admin, QA, push, hosted dry-run, support, theme/language, redesign foundation, business media upload, club mobile operations, reward cover slider, verified report fixes, scanner policy, media fallback, business timeline, active event membership, media recovery, scanner duplicate UX, scanner kiosk polish, and mobile announcement feed route slices recorded in `PROGRESS.md`.

## Current Todos (Mobile Announcement Feed Routes)

- [x] Start a dedicated feature branch.
- [x] Inspect existing announcement backend/mobile read model and role navigation.
- [x] Add optional full-feed CTA support to the shared announcement feed component.
- [x] Add student full announcement feed route and hide it from bottom tabs.
- [x] Add business full announcement feed route and stack registration.
- [x] Link compact student/business feed cards to the full feed.
- [x] Validate mobile checks and diff check.
- [x] Update `PROGRESS.md` with handoff.
- [x] Commit, push, merge to `main`, push `main`, and delete the feature branch.

## Next Queue

- [ ] Physical iPhone native reinstall once devices are online in Xcode; verify `NSCameraUsageDescription` no longer appears.
- [ ] Physical iPhone smoke: scanner-only login opens camera directly, first scan succeeds, second scan shows already-recorded result, history updates.
- [ ] Physical iPhone smoke: upload organizer profile cover/logo, organizer event cover, and business profile cover/logo, then confirm non-zero public images render across student/business/club screens.
- [ ] Full role review after physical smoke: screen necessity, visual clutter, RLS, media, event management, scanner, and QR flow.
