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
npm run smoke:club-events
npm run smoke:department-tags
npm run smoke:oversight
npm run smoke:routes
```

`npm run smoke:routes` expects a running local admin app at `http://localhost:3001` by default. Override with `ADMIN_APP_BASE_URL` when needed.
`npm run smoke:business-applications` expects the local Supabase stack and the local admin app to be running so the seeded auth users, `business_applications` table, review Edge Functions, and route-backed review API are all available.
`npm run smoke:club-events` expects the local Supabase stack, the local admin app, and the local Docker-backed Supabase DB container to be running so a temporary club staff fixture can be seeded and cleaned up around the route test.
`npm run smoke:department-tags` expects the local Supabase stack, the local admin app, and the local Docker-backed Supabase DB container to be running so moderation fixtures can be seeded directly.
`npm run smoke:oversight` expects the local Supabase stack, the local admin app, and the local Docker-backed Supabase DB container to be running so oversight fixtures can be seeded directly.

## Current routes

- `/login`
- `/admin`
- `/admin/business-applications`
- `/admin/department-tags`
- `/admin/oversight`
- `/club`
- `/club/events`
- `/forbidden`

## Current auth shape

- Supabase SSR browser/server clients
- `proxy.ts` session refresh path
- root redirect based on `profiles.primary_role` and `profiles.status`
- password sign-in for local seeded smoke accounts
- Google OAuth trigger for hosted auth
- pending business application review page with approve and reject actions through Edge Functions
- app-local review-flow smoke coverage for RLS visibility and stale-review handling
- department-tag moderation page with route-backed merge and block actions through atomic database functions
- app-local department-tag smoke coverage for non-admin RLS, validation boundaries, and profile-link repair
- platform oversight page for clubs, events, audit logs, and fraud signals
- app-local oversight smoke coverage for admin-only audit visibility, event-scoped fraud visibility, and route rendering
- club event creation page with organizer-only create access, club selection, recent draft visibility, and route-backed create flow
- app-local club event smoke coverage for RLS insert blocking, malformed payload validation, concurrent slug creation, and fixture cleanup before later admin smokes

## Next follow-up slices

- club reward tier management
- stronger CI smoke and RLS regression checks
- concurrency and load-test harnesses for event-day traffic
- deployment and go-to-market runbooks for Vercel or Cloudflare
