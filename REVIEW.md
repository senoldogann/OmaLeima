# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-27
- **Branch:** `feature/department-tags-plan`
- **Scope:** Product and data model planning update for optional student department tags.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `LEIMA_APP_MASTER_PLAN.md`
- `PROGRESS.md`

## Risks

- We must not confuse department tags with auth, permissions, or hard event eligibility.
- Free-text user-created tags can create duplicate sprawl unless the plan includes normalization and merge rules.
- Official club-created tags and user-created custom tags need a clear distinction in the product model.
- The scope should stay small enough to fit the existing roadmap without rewriting the whole schema plan.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` profile, club, student UX, API, and mobile/admin acceptance sections.
- Existing `clubs` concept, because user wants official tags to be creatable by student organizations.
- Existing phased roadmap, because the feature should be inserted without breaking current sequencing.

## Existing Logic Checked

- `profiles` currently has no study field, department, or tag modeling.
- `clubs` already model student organizations and can be reused as official tag sources.
- Current plan does not yet define how optional identity labels appear in student profile, leaderboard, or admin/club tools.

## Review Outcome

Update the product plan now so optional student department tags are first-class in the roadmap, with a future-safe schema direction, UX rules, and ownership boundaries.
