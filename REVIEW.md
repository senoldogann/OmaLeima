# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Remove user-facing diagnostics and internal status surfaces from the mobile product UI, keep only genuinely useful user/business flows visible, and verify whether the hosted admin login page is actually blank or blocked by deployment protection.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/foundation/theme.ts`
- `apps/mobile/src/features/foundation/components/glass-panel.tsx`
- `apps/mobile/src/features/foundation/components/glass-tab-bar-background.tsx`
- `apps/mobile/src/components/app-screen.tsx`
- `apps/mobile/src/components/info-card.tsx`
- `apps/mobile/src/components/status-badge.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/history.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/app/auth/login.tsx`
- `apps/mobile/src/app/auth/callback.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/features/auth/components/login-hero.tsx`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`
- `apps/admin/src/app/login/page.tsx`
- `apps/admin/src/features/auth/components/admin-login-panel.tsx`
- `apps/admin/src/app/globals.css`

## Risks

- Some of the current status cards are not just ugly; they leak internal implementation details such as redirect URIs, backend token registration state, and diagnostics phrasing that users never need to read.
- The profile route currently mixes real user settings with deep technical push smoke output. Removing too much could make notification opt-in harder, but leaving it as-is hurts product trust.
- The QR route still contains a dev smoke token block and extra readiness copy. That is fine for engineering, not for a real user-facing app.
- The hosted admin page may look blank because of Vercel preview protection rather than broken app code; we need to verify the deployment response before touching auth logic unnecessarily.

## Dependencies

- Existing redesign branch state in `feature/full-ui-redesign-foundation`
- The newly introduced STARK design tokens and opaque surface direction
- Local Stitch exports and prompt file for reference:
  - `/Users/dogan/Desktop/stitch_omaleima_liquid_glass_pass`
  - `/Users/dogan/Desktop/stitch_omaleima_liquid_admin_panel`
  - `/Users/dogan/Desktop/stitch_omaleima_android_m3_expressive`
  - `/Users/dogan/Desktop/platform_design_prompts.md`
- Previously validated auth, QR, scanner, stamp, reward, and push flows that must stay intact

## Existing Logic Checked

- The STARK theme continuation is already in place and technically stable after the previous regression fixes.
- `auth/login.tsx` still shows an `Access status` panel with Supabase URL, redirect URI, and route diagnostics that normal users should never see.
- `student/events/index.tsx` still shows a `Student events query` status panel that repeats implementation details instead of helping the student make a choice.
- `student/active-event.tsx` still exposes QR readiness diagnostics and a dev smoke token surface.
- `student/profile.tsx` still shows large push smoke panels for runtime path, project id, last received notification, and last notification response.
- The hosted admin login build succeeds locally, while the hosted URL currently responds with HTTP 401 from Vercel, which strongly points to preview protection rather than a broken Next.js route.

## Review Outcome

Keep the STARK direction, but tighten the product boundary:

- remove user-facing diagnostics and readiness panels from normal flows
- leave only user-meaningful content, actions, and error states
- simplify the profile push area into a normal notification preference surface
- treat the hosted admin blank-page report as a deployment protection issue unless a local build or route check says otherwise
