# Shreeji Beauty Makeover

A Next.js 15 learning platform for beauty and makeup courses.

## Run locally
```bash
npm install
npm run dev
```

## Backend foundation committed
- Supabase browser/server clients
- Student email/password signup and login
- Server-verified teacher/student role checks
- Admin ID/password login with an HTTP-only, signed 8-hour session cookie
- Protected admin, student and teacher portal pages
- PostgreSQL schema for profiles, courses, modules, lessons, enrollments, progress, payments, live sessions, certificates and platform settings
- Row-level security policies and automatic student profile creation

## Required one-time setup
1. Create/connect a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel.
4. Add the server-only `SUPABASE_SERVICE_ROLE_KEY` only to Vercel (never commit it).
5. Add `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` in Vercel Project Settings > Environment Variables. Set them for Production and Preview. Keep them encrypted/sensitive; do not add them to GitHub or any `NEXT_PUBLIC_*` variable.
6. Redeploy after adding environment variables.

The admin ID configured for the initial account is `dukubusiness`. Set its password in Vercel as `ADMIN_PASSWORD`; it is intentionally not stored in this repository.

## Important limitations
Payments, secure video storage, certificates, email delivery and real-time meeting rooms still require provider setup and verified server-side integrations. Do not accept real payments until checkout, webhook signature verification and enrollment creation are implemented and tested.
