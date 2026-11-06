-- Shreeji Beauty Makeover: core LMS schema
create extension if not exists pgcrypto;

create type public.app_role as enum ('student','teacher','admin');
create type public.course_status as enum ('draft','pending','published','archived');
create type public.payment_status as enum ('pending','paid','failed','refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text not null default '',
  category text not null default 'General',
  level text not null default 'Beginner',
  price_paise integer not null default 0 check(price_paise >= 0),
  thumbnail_url text,
  status public.course_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text not null default '',
  video_url text,
  duration_seconds integer not null default 0,
  position integer not null default 0,
  is_preview boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('pending','active','completed','refunded','cancelled')),
  enrolled_at timestamptz not null default now(),
  unique(student_id,course_id)
);
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  watched_seconds integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(student_id,lesson_id)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  provider text not null default 'manual',
  provider_order_id text unique,
  provider_payment_id text unique,
  amount_paise integer not null check(amount_paise >= 0),
  currency text not null default 'INR',
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete set null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meeting_provider text,
  meeting_url text,
  provider_meeting_id text,
  created_at timestamptz not null default now(),
  check(ends_at > starts_at)
);
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz,
  left_at timestamptz,
  unique(session_id,student_id)
);
create table public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index courses_status_idx on public.courses(status);
create index courses_teacher_idx on public.courses(teacher_id);
create index enrollments_student_idx on public.enrollments(student_id);
create index lessons_module_idx on public.lessons(module_id);
create index live_sessions_start_idx on public.live_sessions(starts_at);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,full_name,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'student')
  on conflict(id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns public.app_role language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() $$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.payments enable row level security;
alter table public.live_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.platform_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles read self or teacher/admin" on public.profiles for select to authenticated
using (id=auth.uid() or public.current_user_role() in ('teacher','admin'));
create policy "profiles update self" on public.profiles for update to authenticated
using (id=auth.uid()) with check (id=auth.uid() and role=public.current_user_role());
create policy "published courses readable" on public.courses for select to anon,authenticated
using (status='published' or teacher_id=auth.uid() or public.current_user_role()='admin');
create policy "teacher creates own courses" on public.courses for insert to authenticated
with check (teacher_id=auth.uid() and public.current_user_role() in ('teacher','admin'));
create policy "teacher updates own courses" on public.courses for update to authenticated
using (teacher_id=auth.uid() or public.current_user_role()='admin')
with check (teacher_id=auth.uid() or public.current_user_role()='admin');
create policy "teacher deletes own courses" on public.courses for delete to authenticated
using (teacher_id=auth.uid() or public.current_user_role()='admin');
create policy "modules visible for published or owned courses" on public.modules for select to anon,authenticated
using (exists(select 1 from public.courses c where c.id=course_id and (c.status='published' or c.teacher_id=auth.uid() or public.current_user_role()='admin')));
create policy "teacher manages modules" on public.modules for all to authenticated
using (exists(select 1 from public.courses c where c.id=course_id and (c.teacher_id=auth.uid() or public.current_user_role()='admin')))
with check (exists(select 1 from public.courses c where c.id=course_id and (c.teacher_id=auth.uid() or public.current_user_role()='admin')));
create policy "lessons visible for published or owned courses" on public.lessons for select to anon,authenticated
using (exists(select 1 from public.modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.status='published' or c.teacher_id=auth.uid() or public.current_user_role()='admin')));
create policy "teacher manages lessons" on public.lessons for all to authenticated
using (exists(select 1 from public.modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.teacher_id=auth.uid() or public.current_user_role()='admin')))
with check (exists(select 1 from public.modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.teacher_id=auth.uid() or public.current_user_role()='admin')));
create policy "students see own enrollments" on public.enrollments for select to authenticated
using (student_id=auth.uid() or public.current_user_role()='admin' or exists(select 1 from public.courses c where c.id=course_id and c.teacher_id=auth.uid()));
create policy "students see own progress" on public.lesson_progress for select to authenticated
using (student_id=auth.uid() or public.current_user_role()='admin');
create policy "students manage own progress" on public.lesson_progress for all to authenticated
using (student_id=auth.uid()) with check (student_id=auth.uid());
create policy "students see own payments" on public.payments for select to authenticated
using (student_id=auth.uid() or public.current_user_role()='admin');
create policy "teachers and students see relevant sessions" on public.live_sessions for select to authenticated
using (teacher_id=auth.uid() or public.current_user_role()='admin' or exists(select 1 from public.enrollments e where e.course_id=live_sessions.course_id and e.student_id=auth.uid()));
create policy "teachers manage own sessions" on public.live_sessions for all to authenticated
using (teacher_id=auth.uid() or public.current_user_role()='admin')
with check (teacher_id=auth.uid() or public.current_user_role()='admin');
create policy "attendance own or teacher" on public.attendance for select to authenticated
using (student_id=auth.uid() or public.current_user_role()='admin' or exists(select 1 from public.live_sessions s where s.id=session_id and s.teacher_id=auth.uid()));
create policy "attendance student update own" on public.attendance for all to authenticated
using (student_id=auth.uid()) with check (student_id=auth.uid());
create policy "platform settings admin only" on public.platform_settings for all to authenticated
using (public.current_user_role()='admin') with check (public.current_user_role()='admin');
create policy "audit logs admin only" on public.audit_logs for select to authenticated
using (public.current_user_role()='admin');

grant usage on schema public to anon, authenticated;
grant select on public.courses, public.modules, public.lessons to anon,authenticated;
grant select,update on public.profiles to authenticated;
grant select,insert,update,delete on public.courses,public.modules,public.lessons to authenticated;
grant select on public.enrollments,public.payments,public.live_sessions,public.attendance to authenticated;
grant select,insert,update,delete on public.lesson_progress,public.attendance to authenticated;
grant select,insert,update,delete on public.live_sessions to authenticated;
grant select,insert,update,delete on public.platform_settings to authenticated;
grant select on public.audit_logs to authenticated;
