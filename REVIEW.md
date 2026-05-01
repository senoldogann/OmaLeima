# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-02
- **Branch:** `feature/product-ops-roadmap-assets`
- **Scope:** Product-level operations review for low-friction event-day scanning, organizer mobile access, platform/organizer announcements, security gates, and additional OmaLeima visual assets.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/PRODUCT_OPERATIONS_ROADMAP.md`
- `docs/FINNISH_APPRO_PRODUCT_NOTES.md`
- `apps/mobile/assets/event-covers/*`
- `apps/mobile/src/features/events/event-visuals.ts`

## Risks

- QR scanning cannot become so manual that venues ignore it during rush hour.
- Low-friction scanning must not weaken the core anti-fraud invariant. Convenience should come from better operator modes, not from trusting clients.
- Organizer mobile access should be a real `/club` mobile area, not a shortcut into business scanner screens.
- Announcement systems need audience, consent, moderation, expiry, and delivery history before push is enabled broadly.
- Generated imagery must live inside the repo before any code references it.
- User-owned unstaged changes in `apps/mobile/package.json` and the untracked `.idea/` folder must stay untouched.

## Dependencies

- Current QR flow already has short-lived QR tokens, single-use JTI, atomic scan RPC, scan history, reward unlock push, and manual token fallback.
- Current push stack already has device registration, test push, promotion push, event reminders, notification rows, and Expo push transport.
- Current mobile role access supports student and business roles. Pure club organizer/staff accounts are currently web-only.
- Existing event-cover fallback images are centralized in `apps/mobile/src/features/events/event-visuals.ts`.

## Existing Logic Checked

- `docs/FINNISH_APPRO_PRODUCT_NOTES.md` already calls out venue-specific stamp limits, claim desk, event-day guidance, organizer announcements, and venue-logo stamp memories as missing roadmap items.
- Current scanner requires a staff device to open the app and scan QR manually. That is secure, but it is too much friction for crowded bar moments unless the scanner surface gets an event-day mode.
- Admin-wide announcements and organizer announcements are not currently modeled as first-class tables with read receipts, expiry, or push subscriptions.
- Finnish appro references reinforce that checkpoints, appropassi, leima thresholds, venue limits, claim desks, and event-day information all vary by event. The product needs configurable event operations instead of hard-coded one-size-fits-all assumptions.

## Review Outcome

Document the next product architecture before implementing large behavior changes. Add more repo-owned OmaLeima generated visuals to the centralized mobile fallback image rotation. Leave QR flow, organizer mobile, announcements, subscriptions, and role-invite security as explicit feature slices because they require schema/RPC/UI/security work.
