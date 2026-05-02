# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-02
- **Branch:** `feature/club-mobile-operations`
- **Scope:** Add the next organizer mobile slice: club preferences, support, and safe event create/update/cancel operations.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/auth/session-access.ts`
- `apps/mobile/src/features/auth/components/business-password-sign-in.tsx`
- `apps/mobile/src/features/club/*`
- `apps/mobile/src/app/club/*`
- `apps/mobile/src/features/support/*`
- `supabase/migrations/*`

## Risks

- Club support cannot be faked as business support because organizer accounts may have no `business_staff` membership.
- Event mutations must reuse existing RLS/RPC guarantees; mobile UI validation is not the security boundary.
- Event cancellation must remain soft cancel to preserve operational history.
- Duyuru/push work needs separate moderation, consent, expiry, and delivery model. It should not be squeezed into event CRUD.
- This branch must not stage the user-owned `apps/mobile/package.json` script changes, `RAPOR.md`, or `.idea/` metadata.

## Dependencies

- Existing `/club/home` read model already loads memberships and event metrics.
- Existing `create_club_event_atomic` RPC handles organizer authorization, slug creation, date validation, and status response.
- Existing event update/cancel web transport updates `events` through RLS and only permits DRAFT/PUBLISHED/ACTIVE rows.
- Existing `SupportRequestSheet` supports STUDENT and BUSINESS only; schema check constraint also only allows those areas.
- Business profile already has reusable preference modal patterns for theme/language/support.

## Existing Logic Checked

- `/club/home` has no navigation to settings/support/events management yet.
- Mobile support request schema must add `CLUB` and `club_id` with RLS based on `public.is_club_staff_for(club_id)`.
- Mobile event forms can be kept minimal: name, club, city, cover URL, description, date/time strings, minimum leimat, max participants, visibility/status.
- Staff role can view dashboard/support but should not create/edit events unless the RPC/RLS allows it. The UI should only show create controls for OWNER/ORGANIZER memberships.

## Review Outcome

Implement club preferences/support and event CRUD as the next mobile organizer slice. Add Supabase support schema for `CLUB`, reuse the existing support sheet with club options, and add `/club/profile` plus `/club/events`. Keep announcements as an explicit next feature because it needs a dedicated data model and push consent.
