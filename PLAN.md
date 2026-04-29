# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Ship a real light mode, Finnish-first bilingual mobile copy, and a proper event detail description section without breaking the existing student/business flows.

## Architectural Decisions

- Add a persisted mobile UI preference provider above the current app tree and let it own:
  - theme mode (`dark` / `light`)
  - language (`fi` / `en`)
- Keep Finnish as the default when the device locale starts with `fi`; otherwise fall back to English.
- Move the shared foundation from a single exported dark token object to dual dark/light theme objects plus a current-theme hook.
- Convert route and shared component styles to runtime theme-aware factories instead of relying on module-static dark tokens.
- Keep translations local to the mobile app with a strict typed dictionary instead of adding a heavyweight i18n framework for this slice.
- Promote event descriptions into their own content section under the hero so long organizer copy remains readable.

## Alternatives Considered

- Add only a system-color-scheme switch and skip persisted preferences:
  - rejected because the user explicitly asked for a real open/dark theme addition across the app, not a hidden OS-only behavior
- Keep the current static `mobileTheme` and try to patch just route backgrounds:
  - rejected because shared cards, badges, tabs, and auth controls would remain visually inconsistent in light mode
- Add a third-party i18n library immediately:
  - rejected because the app only needs two languages right now and we need tight control over Finnish wording
- Keep event description as hero summary text:
  - rejected because detailed events need a dedicated readable block

## Edge Cases

- The first render should not flash dark English UI and then jump to light Finnish once preferences load.
- Shared formatters (dates, counts, tab titles, status strings) must respect the current language.
- Business and student layouts both have access/loading/error states that need translation too, not just the “happy path” screens.
- Some copy comes from helper functions inside feature components (`reward-progress-card`, `leaderboard-entry-card`, tag cards); those must not stay English-only.
- The event detail description section must still read well when `description` is missing.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this slice.
- Add UI preference + i18n infrastructure above the existing mobile app tree.
- Convert shared mobile foundation pieces to runtime theme-aware styles.
- Translate student, business, auth, and shared mobile surfaces into Finnish/English.
- Add explicit description content on event detail.
- Manually sweep the current mobile routes for missed hardcoded strings or dark-only assumptions.
- Verify mobile with:
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/mobile run lint`
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/mobile run typecheck`
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/mobile run export:web`
- Update `PROGRESS.md` with the new handoff note.
