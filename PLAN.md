# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/pilot-secret-hygiene-audit`
- **Goal:** Add a repo-owned secret and password hygiene gate around the current pilot operator credential file and related GitHub secret names.

## Architectural Decisions

- Extract the Desktop credential-file parser into a shared helper so multiple hosted pilot scripts can reuse the same source of truth.
- Add one focused hygiene audit under `apps/admin/scripts`.
- Keep the audit local and read-only: inspect file permissions, parse credentials, and inspect GitHub secret names only.
- Avoid printing passwords in success or failure output.

## Alternatives Considered

- Leaving secret hygiene as a human memory task:
  - rejected because a stale Desktop file or permissive file mode is exactly the sort of thing a repeatable audit should catch
- Reading GitHub secret values through a custom side channel:
  - rejected because we do not need another secret path and GitHub intentionally does not expose secret values
- Auto-fixing file permissions from the audit:
  - rejected because this slice should tell the owner what changed, not silently mutate the file system

## Edge Cases

- The Desktop credential file may be missing, moved, or manually edited; parsing and validation should fail loudly.
- The credential file may still be syntactically valid while containing weak or duplicate passwords; the audit should catch that.
- GitHub CLI may be unauthenticated; the audit should fail clearly instead of pretending secret presence was checked.

## Validation Plan

- Update the working docs.
- Add the shared credential parser plus the new hygiene audit and root wrapper.
- Run `npm --prefix apps/admin run lint`.
- Run `npm --prefix apps/admin run typecheck`.
- Run the real hygiene audit against the current Desktop credential file.
- Keep the existing hosted final dry-run command green after the helper extraction.
- Update launch docs and handoff notes with the new command and owner guidance.
