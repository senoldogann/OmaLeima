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
npm run smoke:routes
```

`npm run smoke:routes` expects a running local admin app at `http://localhost:3001` by default. Override with `ADMIN_APP_BASE_URL` when needed.

## Current routes

- `/login`
- `/admin`
- `/club`
- `/forbidden`

## Current auth shape

- Supabase SSR browser/server clients
- `proxy.ts` session refresh path
- root redirect based on `profiles.primary_role` and `profiles.status`
- password sign-in for local seeded smoke accounts
- Google OAuth trigger for hosted auth

## Next follow-up slices

- business applications review module
- club event creation and reward management
- stronger CI smoke and RLS regression checks
- deployment and go-to-market runbooks for Vercel or Cloudflare
