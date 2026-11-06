# Shreeji Beauty Makeover

Next.js 15 beauty-learning platform with Supabase Auth, Postgres and row-level security.

## Local development
```bash
npm install
npm run dev
```

## Included backend
- Student signup and email/password login through Supabase Auth
- Profile creation on signup
- Teacher workspace and teacher-owned draft course creation
- Admin dashboard using a Supabase Auth session and database-backed admin role
- Admin course management, account directory, teacher-role assignment and platform settings
- Postgres LMS schema with RLS policies for profiles, courses, modules, lessons, enrollments, progress, payments, live sessions, attendance, certificates and audit logs

## Environment variables
Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_USERNAME` and `ADMIN_LOGIN_EMAIL` in your deployment environment. The browser key is a publishable/anon key protected by RLS. No service-role key is required by the current app routes.

## First admin account
1. Register a Supabase Auth account using the email configured as `ADMIN_LOGIN_EMAIL`.
2. Confirm that email using the confirmation message from Supabase Auth.
3. In Supabase SQL Editor, promote that user's profile to the admin role:
   ```sql
   update public.profiles p
   set role = 'admin', updated_at = now()
   from auth.users u
   where p.id = u.id and u.email = 'YOUR_ADMIN_LOGIN_EMAIL';
   ```
4. Sign in at `/login` using the admin ID from `ADMIN_USERNAME` and the password chosen during registration.

The app checks the Supabase Auth session and the database role on every protected admin request. The role cannot be assigned by the user through signup.

## Database
Apply the SQL migrations in `supabase/migrations` in order. They create the LMS tables, RLS rules, explicit Data API grants and private-schema helper functions.

## Not active yet
Payment gateway checkout/webhook verification, video uploads/streaming, certificate generation, email delivery and live meeting rooms still require provider configuration and additional implementation. Do not treat these as live features until tested.
