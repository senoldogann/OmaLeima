# OmaLeima

Digital leima pass for Finnish student overalls events.

## Phase status

- Phase 1 complete
- Phase 2 complete
- Phase 3 complete
- Phase 4 complete
- Phase 5 complete
- Phase 6 complete

## Current readiness

Current verified state:

- hosted admin verification is wired
- hosted pilot operator hygiene audit is green
- placeholder pilot admin, organizer, and scanner accounts now exist with random passwords generated locally
- iPhone student login, push, QR rotation, scanner fallback, stamp creation, and reward-unlock push are verified
- Android emulator app-flow smoke is usable for OmaLeima on Expo Go
- Android emulator business email/password sign-in is verified

Must-have before a private pilot:

- current operator credential file proves a green hosted final dry-run
- one last pilot dry-run with real operator accounts
- replacing the placeholder pilot operator emails with real club/operator emails once the first pilot club is known
- keeping the local operator credential file stored safely outside the repo

Needed before a broader public launch:

- Android remote-push physical-device smoke
- custom domain cutover
- public store release steps
- Android student Google sign-in proof on a real Android development build

Later:

- full mobile UI redesign and broad visual polish
- broader Android release confidence beyond the first supported operator path

For the short owner-facing next steps in Turkish, see the `Senin icin kisa not (TR)` section in [docs/LAUNCH_RUNBOOK.md](docs/LAUNCH_RUNBOOK.md).

## Testing

The current local QA entry point is:

```bash
npm run qa:phase6-core
```

Function-backed expanded QA entry point:

```bash
npm run qa:phase6-expanded
```

Readiness entry point for the full current Phase 6 matrix plus leaderboard load validation:

```bash
npm run qa:phase6-readiness
```

Focused browser click-path entry point for seeded admin login plus business application review:

```bash
npm run qa:browser-admin-review
```

Focused mobile Realtime readiness audit:

```bash
npm run qa:mobile-realtime-readiness
```

Hosted admin verification entry point for preview or staging URLs:

```bash
ADMIN_APP_BASE_URL=https://your-preview-or-staging-url \
STAGING_ADMIN_EMAIL=admin@example.com \
STAGING_ADMIN_PASSWORD=secret \
npm run qa:staging-admin-verification
```

Hosted admin readiness audit for real Vercel link, Vercel env names, and GitHub Actions secrets:

```bash
npm run qa:hosted-admin-readiness
npm --prefix apps/admin run audit:hosted-setup
```

Pilot operator hygiene readiness gate:

```bash
npm run qa:pilot-operator-readiness
npm --prefix apps/admin run audit:pilot-operator-hygiene
```

Hosted final dry-run gate using the Desktop operator credential file:

```bash
npm run qa:private-pilot-final-dry-run
npm --prefix apps/admin run run:pilot-final-dry-run
```

Supabase auth cutover readiness for the hosted preview-mode versus custom-domain-mode switch:

```bash
npm run qa:supabase-auth-cutover-readiness
npm --prefix apps/admin run audit:supabase-auth-url-config
SUPABASE_AUTH_CONFIG_APPLY_MODE=dry-run \
SUPABASE_AUTH_CONFIG_APPLY_TARGET=custom-domain \
npm --prefix apps/admin run apply:supabase-auth-url-config
```

Admin hosted env preflight:

```bash
npm --prefix apps/admin run check:hosted-env
REQUIRE_HOSTED_ADMIN_ENV=1 \
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_real_value \
npm --prefix apps/admin run check:hosted-env
```

Testing prerequisites and the expanded smoke matrix live in [docs/TESTING.md](docs/TESTING.md).
Launch, fallback, and event-day operating guidance lives in [docs/LAUNCH_RUNBOOK.md](docs/LAUNCH_RUNBOOK.md).
