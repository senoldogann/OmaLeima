# OmaLeima Admin

Next.js App Router admin and club organizer panel for OmaLeima.

## Required env

Create `.env.local` from `.env.example`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Run

```bash
npm run dev
```

Default local URL: [http://localhost:3000](http://localhost:3000)

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke:auth
npm run smoke:business-applications
npm run smoke:routes
```

`npm run smoke:routes` expects a running local admin app at `http://localhost:3001` by default. Override with `ADMIN_APP_BASE_URL` when needed.
`npm run smoke:business-applications` expects the local Supabase stack and the local admin app to be running so the seeded auth users, `business_applications` table, review Edge Functions, and route-backed review API are all available.

## Current routes

- `/login`
- `/admin`
- `/admin/business-applications`
- `/club`
- `/forbidden`

## Current auth shape

- Supabase SSR browser/server clients
- `proxy.ts` session refresh path
- root redirect based on `profiles.primary_role` and `profiles.status`
- password sign-in for local seeded smoke accounts
- Google OAuth trigger for hosted auth
- pending business application review page with approve and reject actions through Edge Functions
- app-local review-flow smoke coverage for RLS visibility and stale-review handling

## Next follow-up slices

- club event creation and reward management
- platform-wide audit, fraud, and moderation surfaces
- stronger CI smoke and RLS regression checks
- concurrency and load-test harnesses for event-day traffic
- deployment and go-to-market runbooks for Vercel or Cloudflare
