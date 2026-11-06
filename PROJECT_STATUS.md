# Project status

## Backend source committed
The repository now includes Supabase Auth client flows for student signup/login, a database migration with core LMS tables and row-level security, a protected server-side admin session, admin course management APIs, admin user directory and role assignment, platform settings, and teacher-owned draft course creation.

## Admin credentials
The requested admin ID/password have been added to Vercel as encrypted server-side environment variables. They are not stored in the public repository or browser code. Admin login uses a signed HTTP-only cookie with an eight-hour expiry.

## Still awaiting Supabase project creation
Supabase quoted the new project at $0/month, but its project-creation API requires explicit cost confirmation. After confirmation: create the Mumbai-region project, apply the migration, retrieve the project URL and publishable/service-role keys, add them to Vercel encrypted environment variables, redeploy, and test auth and admin data flows.

## Not yet integrated
Payment gateway verification, secure video storage, certificates, email delivery and live meeting provider still require configuration and implementation.
