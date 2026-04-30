# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-01
- **Branch:** `feature/push-diagnostics-polish`
- **Scope:** Finish the support/settings polish slice: keep support inputs visible above the keyboard, move recent support requests into a cleaner secondary menu, add a lightweight send animation, center and verify the QA diagnostics clear action, and stop the student QR timer from resetting early on quick tab switches.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/components/app-screen.tsx`
- `apps/mobile/src/components/app-icon.tsx`
- `apps/mobile/src/features/qr/student-qr.ts`
- `apps/mobile/src/features/support/components/support-request-sheet.tsx`

## Risks

- The support modal currently bypasses most of the shared keyboard handling, so iOS can hide the subject/message fields under the software keyboard.
- The inline `Viimeisimmät pyynnöt` list bloats the support sheet and steals vertical space from the form itself.
- QR countdown currently keys off local query refresh time instead of the actual token expiry, which can make the timer restart even while the token is still valid.
- This pass touches shared mobile primitives and modal behavior, so sloppy changes can ripple through multiple routes.

## Dependencies

- Existing `UiPreferencesProvider` still owns language/theme state and should keep driving both student and business settings.
- The dev-only push diagnostics modal should stay available for QA, but it should remain visually demoted and clearly separated from user settings.
- `useGenerateQrTokenQuery` already returns `expiresAt`; the countdown should respect that server timestamp instead of local refresh timestamps.
- Existing mobile validation commands remain the minimum merge gate.

## Existing Logic Checked

- The latest remote Supabase now has `support_requests`; the current issues are UI/interaction problems, not missing backend state.
- `SupportRequestSheet` currently renders latest requests inline in the same scroll flow as the form, which is why the typing surface feels cramped.
- `AppScreen` already uses `KeyboardAvoidingView`, but the support modal is outside that shell and needs its own keyboard-aware layer.
- Student QR countdown uses `dataUpdatedAt + refreshAfterSeconds`, so a remount can make the 30-second window look like it restarted.

## Review Outcome

Do a focused polish pass:

- refresh the working docs so branch and scope stay truthful
- make the support sheet keyboard-safe on iPhone
- move latest support requests behind a cleaner secondary history menu
- add a lightweight sent animation that does not require backend changes
- center the QA clear button and make its state change visible
- fix QR countdown to respect real token expiry across quick tab switches
- rerun the relevant mobile validation gates
- record the outcome before merging back to `main`
