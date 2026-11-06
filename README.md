# Shreeji Beauty Makeover

Next.js 15 beauty-learning platform starter with Supabase-backed account flows and a secure server-side admin area.

## Local development
```bash
npm install
npm run dev
```

## Included
- Responsive public website and course catalogue
- Student signup/login through Supabase Auth
- Teacher workspace and teacher-owned draft course creation
- Protected admin login with an HTTP-only signed session
- Admin overview, user directory, role assignment, course creation/status management and platform settings
- LMS schema migration with row-level security policies

## Required environment variables
Copy `.env.example` to `.env.local` and populate:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose in client code)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` (32+ random characters)

Admin credentials are checked server-side and the session cookie is HTTP-only, secure in production, same-site strict and expires after 8 hours. Never commit secrets to Git.

## Database setup
Apply `supabase/migrations/202611060001_initial_lms.sql` to the Supabase project. The migration creates profiles, courses, modules, lessons, enrollments, progress, payments, live sessions, attendance, platform settings and audit logs, with row-level security.

## Not connected yet
A live payment provider, video hosting, certificates, email delivery and live meeting provider still require provider accounts/credentials and additional integration. Course checkout and live classes must not be represented as active until those integrations are verified.
