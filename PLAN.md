# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-27
- **Branch:** `feature/department-tags-plan`
- **Goal:** Add optional student department tags to the product and implementation roadmap before the next major feature step.

## Architectural Decisions

- Keep department tags optional and profile-oriented.
- Separate canonical tag catalog data from per-student selected tags.
- Allow two creation sources: official tags from clubs/admin and custom tags from users.
- Allow one primary tag and a small bounded number of total tags per student.
- Treat tags as discovery/community metadata only, not permissions or eligibility data.
- Add duplicate-control planning now: slug normalization, merge path, and admin cleanup workflow.

## Alternatives Considered

- A single free-text `department_name` column on `profiles`: rejected because it cannot distinguish official vs custom entries and will create duplicate spelling variants quickly.
- Reusing `clubs` directly as tags: rejected because a club and a study/programme label are related but not the same domain object.
- Admin-only creation: rejected because the user explicitly wants both organization-created and user-created tags.

## Edge Cases

- Missing or malformed JSON body.
- Duplicate tags such as `Tieto ja viestintätekniikka` vs `Tieto- ja viestintätekniikka`.
- The same programme name existing across multiple universities.
- Users wanting to keep more than one identity label.
- Clubs wanting official tags without becoming gatekeepers over all custom tags.
- Businesses seeing unnecessary student identity data.

## Validation Plan

- Update the master plan with a future schema for canonical tags and profile-tag links.
- Update student UX, public read model, and admin/club acceptance criteria.
- Update `PROGRESS.md` so the next agent understands the new scope and sequencing.
- Review the diff for consistency with the phased roadmap.
