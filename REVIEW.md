# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-02
- **Branch:** `feature/deep-project-review-hardening`
- **Scope:** Continue the deep review pass, fix the concrete admin route auth drift already found, realign the web admin visual system with the mobile OmaLeima palette and generated brand imagery, and fix the student profile department-tag modal keyboard regression.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/src/app/api/club/**/*.ts`
- `apps/admin/src/app/globals.css`
- `apps/admin/src/app/layout.tsx`
- `apps/admin/src/features/auth/components/admin-login-panel.tsx`
- `apps/admin/src/features/dashboard/components/dashboard-shell.tsx`
- `apps/admin/src/features/auth/*`
- `apps/admin/public/fonts/*`
- `apps/admin/public/images/omaleima-ops-hero.png`
- `apps/mobile/assets/event-covers/omaleima-ops-hero.png`
- `apps/mobile/src/features/events/event-visuals.ts`
- `apps/mobile/src/app/student/profile.tsx`

## Risks

- Admin API routes must resolve the authenticated actor the same way as SSR guards. Mixing `getClaims()` and `getUser()` can create subtle hosted/session drift.
- Route-level auth helper changes must not loosen club organizer, reward tier, reward claim, or department tag permissions.
- The review should not turn into a broad redesign. Only concrete correctness, security, or product-flow inconsistencies should be changed.
- Web admin must not feel like a disconnected product from mobile. The same black/lime/Poppins visual language should be used without adding fragile layout complexity.
- Generated imagery must live inside the repo before any code references it.
- The department tag editor is a modal outside the shared `AppScreen` scroll view, so it needs its own keyboard avoidance.
- Club organizer mobile access is currently not implemented; only student and business areas have mobile route surfaces. Admin can remain web-only, but organizer mobile is a valid follow-up product slice.
- User-owned unstaged changes in `apps/mobile/package.json` and the untracked `.idea/` folder must stay untouched.

## Dependencies

- `resolveAdminAccessAsync()` already uses `supabase.auth.getUser()` for SSR-protected admin and club pages.
- Club mutation routes pass actor ids into atomic RPCs such as `create_club_event_atomic`, `create_reward_tier_atomic`, `update_reward_tier_atomic`, `claim_reward_atomic`, and `create_club_department_tag_atomic`.
- Existing route-level access guards still decide whether the current session can reach each mutation.

## Existing Logic Checked

- The prior password-session fix aligned hosted login cookies, but several club mutation routes still read the user id via `supabase.auth.getClaims()`.
- Product notes already identify the next major product gap: event-rule and venue-stamp-limit modeling. That is important but belongs in a dedicated schema/RPC feature branch, not this review pass.
- Dev-only student leima preview controls are guarded by `__DEV__`, so they are not a production leakage issue.
- Mobile already defines the target palette in `apps/mobile/src/features/foundation/theme.ts`: black base, lime primary, soft white text, restrained surfaces, Poppins typography.
- Admin web was using the right general colors but still felt like a separate glass-dashboard skin because the login hero and shell relied mostly on generic panels and text.
- `fetchSessionAccessAsync()` routes `STUDENT` accounts to student, active `business_staff` memberships to business, and leaves pure `CLUB_ORGANIZER` / `CLUB_STAFF` / `PLATFORM_ADMIN` accounts unsupported on mobile.

## Review Outcome

Add one route auth helper that resolves the current admin route user through `getUser()`, then use it in club mutation routes that need an actor id. Also replace the admin web skin with a cleaner mobile-aligned shell, local Poppins fonts, SVG login icons, and an imagegen-created OmaLeima event/leima hero asset shared with mobile fallback covers. The student department-tag modal now gets a dedicated keyboard-aware wrapper so the custom tag input stays above the keyboard. Leave larger roadmap features as documented follow-ups unless the review finds a concrete bug with a safe fix.
