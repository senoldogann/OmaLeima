# TODOS.md

Bu dosya her branch'te plani kucuk, uygulanabilir ve dogrulanabilir adimlara bolmek icin kullanilir.

## Completed Todos (Previous Waves)

- [x] Complete the database, edge function, mobile MVP, scanner, admin, QA, push, hosted dry-run, support, theme/language, redesign foundation, business media upload, club mobile operations, reward cover slider, verified report fixes, scanner policy, media fallback, business timeline, and active event membership slices recorded in `PROGRESS.md`.

## Current Todos (Media Upload Render Recovery)

- [x] Start a dedicated feature branch.
- [x] Inspect mobile media upload helpers, render fallback, storage policies, and remote storage objects.
- [x] Verify that old storage objects include zero-byte media while newer uploads are non-zero.
- [x] Harden public image verification with retries and range GET byte proof.
- [x] Add migration to clear DB references to zero-byte storage media.
- [x] Push migration to remote Supabase and verify broken references are gone.
- [x] Validate mobile checks and diff check.
- [x] Update `PROGRESS.md` with handoff.
- [ ] Commit, push, merge to `main`, push `main`, and delete the feature branch.

## Next Queue

- [ ] Physical iPhone smoke: scanner-only login opens camera directly, first scan succeeds, second scan shows already-recorded result, history updates.
- [ ] Physical iPhone smoke: upload organizer profile cover/logo, organizer event cover, and business profile cover/logo, then confirm non-zero public images render across student/business/club screens.
- [ ] Add scanner PIN reset audit review in admin/club tools if needed.
