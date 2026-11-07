-- Per-admin login IDs. Passwords remain exclusively in Supabase Auth and are never stored in plaintext.
create table if not exists public.admin_login_accounts (
  login_id text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  last_password_reset_at timestamptz
);
alter table public.admin_login_accounts enable row level security;
revoke all on public.admin_login_accounts from anon, authenticated;
grant all privileges on public.admin_login_accounts to service_role;
