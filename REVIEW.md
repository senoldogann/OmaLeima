# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Fix the new mobile business render regression, simplify login into an onboarding-first entry flow, improve sign-in loading feedback, and harden the hosted admin login route so anonymous visitors do not get a blank server error page.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/foundation/components/auto-advancing-rail.tsx`
- `apps/mobile/src/app/auth/login.tsx`
- `apps/mobile/src/features/auth/components/login-hero.tsx`
- `apps/mobile/src/features/auth/components/google-sign-in-button.tsx`
- `apps/mobile/src/features/auth/components/business-password-sign-in.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/history.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `apps/admin/src/app/login/page.tsx`
- `apps/admin/src/features/auth/access.ts`

## Risks

- `Link asChild` plus style arrays can crash Expo Router again if we only patch one screen and leave the same pattern elsewhere.
- The login simplification can accidentally hide the difference between student and business auth flows if the mode switch becomes too abstract.
- A first-run onboarding pass must stay lightweight and not become a second wall of text after the user explicitly asked for less copy.
- Hosted admin login should not silently mask auth problems; it needs to stay debuggable even if we make the anonymous path more resilient.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing sign-in flows in `signInWithGoogleAsync`, password auth, and `fetchSessionAccessAsync`
- Existing `AutoAdvancingRail` helper for simple onboarding motion
- Current hosted Supabase admin auth routing in the Next.js app

## Existing Logic Checked

- The scanner crash is consistent with `expo-router` rejecting style arrays passed through `Link asChild` children, and multiple business screens still use that pattern.
- Mobile login already has working Google and password flows; the requested change is mostly presentation, onboarding, and loading behavior.
- The hosted admin login page currently resolves access server-side before rendering, which can hard-fail the whole page even for anonymous visitors.

## Review Outcome

Do a focused hardening + onboarding pass:

- remove the `Link asChild` regression path from the business surfaces
- simplify the login page and replace extra explanation with compact onboarding slides
- add stronger loading feedback during sign-in and access resolution
- make hosted admin login render safely for anonymous visitors while preserving redirects for signed-in users
- re-run mobile and admin validation after the fixes
