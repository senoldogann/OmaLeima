# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/department-tags-foundation`
- **Scope:** Phase 3 student department tag foundation at the database and seed layer.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/DATABASE.md`
- `LEIMA_APP_MASTER_PLAN.md`
- `supabase/migrations/*department_tags*.sql`
- `supabase/seed.sql`

## Risks

- Department tags are optional discovery metadata, so the schema must not accidentally turn them into authorization or event-eligibility data.
- Students need free-text custom tags, but duplicate labels will still happen; the foundation must preserve canonical merge support instead of forcing unsafe hard uniqueness on titles.
- Profile tags need product limits at the database level. UI-only limits would drift and create inconsistent state under concurrent writes.
- Merge, block, or profile-role changes can invalidate existing rows later, so this foundation cannot stop at insert-time checks only.
- Club-created official tags must stay scoped to clubs that the caller actually manages.
- Public display will eventually show only safe metadata, so the first RLS pass should stay conservative around profile-to-tag links.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` sections `6.4.a`, `6.4.b`, `13.1`, and the admin/club rules for official tags and duplicate merges.
- Existing `profiles` and `club_members` tables plus helper functions `is_platform_admin` and `is_club_staff_for`.
- Existing local auth seed users for admin, organizer, and student smoke validation.

## Existing Logic Checked

- `student/profile` already reserves the department-tag surface and explicitly waits for this schema branch.
- Current database foundation already has reusable role helpers and RLS patterns for user-owned rows, club-scoped permissions, and admin-only moderation.
- The first draft of this branch proved that insert-time validation alone is not enough; the final shape also needs atomic slot allocation and dependent-row repair triggers.
- There is no current department-tag schema, seed data, or policy layer, so the next correct step is a dedicated migration before Phase 3 profile UI work starts.
- The master plan already defines the desired tables, product limits, and merge model, which means this branch should implement the database shape instead of inventing a new product direction.

## Review Outcome

Add a dedicated Supabase migration for `department_tags` and `profile_department_tags`, enforce profile tag limits and canonical merge safety at the database layer, seed a small local dataset, and document the resulting RLS/write rules before the Phase 3 profile UI branch begins.
