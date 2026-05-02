# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-02
- **Branch:** `feature/club-mobile-dashboard`
- **Scope:** Add the first native mobile `/club` area so organizer and club staff accounts can enter the app and see a read-only event-day operations dashboard.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/auth/session-access.ts`
- `apps/mobile/src/features/auth/components/business-password-sign-in.tsx`
- `apps/mobile/src/features/club/*`
- `apps/mobile/src/app/index.tsx`
- `apps/mobile/src/app/auth/_layout.tsx`
- `apps/mobile/src/app/student/_layout.tsx`
- `apps/mobile/src/app/business/_layout.tsx`
- `apps/mobile/src/app/club/*`

## Risks

- Organizer and club staff must not be routed into `/business` because they do not necessarily belong to a venue scanner account.
- Platform admin should stay web-first for now; giving admin native access without a real admin mobile surface would be misleading.
- Club mobile must rely on existing RLS-backed read permissions. The first slice should not add client-side-only authorization assumptions.
- Dashboard queries can become heavy if they turn into N+1 requests. Fetch event rows, registrations, venues, rewards, claims, and stamps in bounded batches.
- This branch must not stage the user-owned `apps/mobile/package.json` script changes, `RAPOR.md`, or `.idea/` metadata.

## Dependencies

- Current mobile role access supports student and active business memberships only. `CLUB_ORGANIZER` and `CLUB_STAFF` are marked unsupported even when `club_members` rows exist.
- Existing Supabase RLS allows club staff to read/manage their own events and read event registrations, venues, stamps, and reward claims through `public.can_user_manage_event`.
- Admin web already has read-model logic for club event counts; the mobile slice can mirror that shape without importing Next.js/server code.
- `AppScreen`, `InfoCard`, `CoverImageSurface`, `StatusBadge`, `AppIcon`, and theme/i18n providers are the existing mobile UI primitives to reuse.

## Existing Logic Checked

- `business-password-sign-in.tsx` explicitly signs out pure club roles after login, which is why organizer accounts work on web but not native mobile.
- `session-access.ts` only fetches `business_staff`; no active `club_members` check exists in the mobile client.
- Student and business route layouts redirect only between student/business areas. A third `club` area needs explicit routing protection to avoid access bounce loops.
- The first club mobile route should be read-only: active/upcoming events, registered count, joined venue count, stamp count, reward tier count, and reward claim count are enough to validate the architecture.

## Review Outcome

Implement `/club` mobile as a minimal, safe read-only area. Extend session access to recognize active club memberships and route organizer/staff accounts to `/club/home`. Keep platform admin unsupported on native mobile. Do not add mutations in this slice; event creation/update, announcements, claim queues, and venue/stamp rule editing remain separate feature branches.
