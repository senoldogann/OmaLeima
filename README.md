# OmaLeima

Digital leima pass for Finnish student overalls events.

## Phase status

- Phase 1 complete
- Phase 2 complete
- Phase 3 complete
- Phase 4 complete
- Phase 5 complete
- Phase 6 complete

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

Hosted admin verification entry point for preview or staging URLs:

```bash
ADMIN_APP_BASE_URL=https://your-preview-or-staging-url \
STAGING_ADMIN_EMAIL=admin@example.com \
STAGING_ADMIN_PASSWORD=secret \
npm run qa:staging-admin-verification
```

Testing prerequisites and the expanded smoke matrix live in [docs/TESTING.md](docs/TESTING.md).
Launch, fallback, and event-day operating guidance lives in [docs/LAUNCH_RUNBOOK.md](docs/LAUNCH_RUNBOOK.md).
