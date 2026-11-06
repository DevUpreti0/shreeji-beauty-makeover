# Shreeji Beauty Makeover

A premium, responsive Next.js 15 starter for a beauty-learning platform.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Included in this starter
- Responsive public landing page and course catalogue
- Course search, category filters and course preview dialogs
- Student, teacher and admin dashboard previews
- Login/signup interface with role selector (demo only)
- DuKu Meet branded meeting lobby preview at `/meeting`

## Important: production integrations are not yet enabled
The current login form is a UI demo and does not create or authenticate accounts. Dashboard metrics are sample values. Course enrolment and checkout are previews only. No live video meeting provider is connected.

Before accepting real students or payments:
1. Create a Supabase project and apply a reviewed schema with row-level security.
2. Implement Supabase Auth, email verification, role checks and server-side authorization.
3. Configure secure media/video storage and upload limits.
4. Integrate a payment provider (such as Razorpay) using server-side secrets, webhook signature validation and verified payment records.
5. Connect a live meeting provider with authenticated server-side room creation.
6. Add email delivery, privacy policy, terms, backups and monitoring.

Never expose Supabase service-role keys, payment secrets or meeting API secrets in browser code.
