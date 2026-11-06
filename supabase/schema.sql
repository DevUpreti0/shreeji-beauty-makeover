-- Shreeji Beauty Makeover LMS schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 role text not null default 'student' check (role in ('student','teacher','admin')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.courses (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid references public.profiles(id) on delete set null,
 title text not null,
 slug text unique not null,
 category text not null default 'General',
 description text,
 thumbnail_url text,
 price_inr integer not null default 0 check(price_inr>=0),
 price_paise bigint not null default 0 check(price_paise>=0),
 status text not null default 'draft' check(status in ('draft','pending','published','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.modules (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete cascade,
 title text not null,
 sort_order integer not null default 0
);
create table if not exists public.lessons (
 id uuid primary key default gen_random_uuid(),
 module_id uuid not null references public.modules(id) on delete cascade,
 title text not null,
 description text,
 video_url text,
 duration_seconds integer not null default 0,
 is_preview boolean not null default false,
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.enrollments (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 status text not null default 'active' check(status in ('pending','active','completed','refunded','cancelled')),
 enrolled_at timestamptz not null default now(),
 unique(student_id,course_id)
);
create table if not exists public.lesson_progress (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade,
 lesson_id uuid not null references public.lessons(id) on delete cascade,
 completed boolean not null default false,
 watched_seconds integer not null default 0,
 updated_at timestamptz not null default now(),
 unique(student_id,lesson_id)
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete restrict,
 provider text not null default 'razorpay',
 provider_order_id text unique,
 provider_payment_id text unique,
 amount_inr integer not null check(amount_inr>=0),
 status text not null default 'created' check(status in ('created','authorized','captured','failed','refunded')),
 created_at timestamptz not null default now()
);
create table if not exists public.live_sessions (
 id uuid primary key default gen_random_uuid(),
 course_id uuid references public.courses(id) on delete set null,
 teacher_id uuid not null references public.profiles(id) on delete cascade,
 title text not null,
 starts_at timestamptz not null,
 meeting_provider text,
 meeting_url text,
 provider_meeting_id text,
 status text not null default 'scheduled' check(status in ('scheduled','live','ended','cancelled')),
 created_at timestamptz not null default now()
);
create table if not exists public.certificates (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 certificate_number text unique not null,
 issued_at timestamptz not null default now(),
 unique(student_id,course_id)
);
create table if not exists public.platform_settings (
 key text primary key,
 value jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 updated_by uuid references public.profiles(id)
);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
 begin
  insert into public.profiles(id,full_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'student') on conflict(id) do nothing;
  return new;
 end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.payments enable row level security;
alter table public.live_sessions enable row level security;
alter table public.certificates enable row level security;
alter table public.platform_settings enable row level security;

create policy "Profiles read self or admin" on public.profiles for select using(id=auth.uid() or public.is_admin());
create policy "Profiles update self" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid() and role='student');
create policy "Published courses public" on public.courses for select using(status='published' or teacher_id=auth.uid() or public.is_admin());
create policy "Teachers create courses" on public.courses for insert with check(teacher_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and role='teacher'));
create policy "Teachers update own courses" on public.courses for update using(teacher_id=auth.uid() or public.is_admin()) with check(teacher_id=auth.uid() or public.is_admin());
create policy "Admins delete courses" on public.courses for delete using(public.is_admin());
create policy "Read modules for visible courses" on public.modules for select using(exists(select 1 from public.courses c where c.id=course_id and (c.status='published' or c.teacher_id=auth.uid() or public.is_admin())));
create policy "Teachers manage modules" on public.modules for all using(exists(select 1 from public.courses c where c.id=course_id and (c.teacher_id=auth.uid() or public.is_admin()))) with check(exists(select 1 from public.courses c where c.id=course_id and (c.teacher_id=auth.uid() or public.is_admin())));
create policy "Read lessons for visible modules" on public.lessons for select using(exists(select 1 from public.modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.status='published' or c.teacher_id=auth.uid() or public.is_admin())));
create policy "Teachers manage lessons" on public.lessons for all using(exists(select 1 from public.modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.teacher_id=auth.uid() or public.is_admin()))) with check(exists(select 1 from public.modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.teacher_id=auth.uid() or public.is_admin())));
create policy "Users read own enrollments" on public.enrollments for select using(student_id=auth.uid() or public.is_admin() or exists(select 1 from public.courses c where c.id=course_id and c.teacher_id=auth.uid()));
create policy "Users read own progress" on public.lesson_progress for select using(student_id=auth.uid() or public.is_admin());
create policy "Users manage own progress" on public.lesson_progress for all using(student_id=auth.uid()) with check(student_id=auth.uid());
create policy "Users read own payments" on public.payments for select using(student_id=auth.uid() or public.is_admin());
create policy "Teachers and students read relevant sessions" on public.live_sessions for select using(teacher_id=auth.uid() or public.is_admin() or exists(select 1 from public.enrollments e where e.course_id=live_sessions.course_id and e.student_id=auth.uid() and e.status='active'));
create policy "Teachers manage own sessions" on public.live_sessions for all using(teacher_id=auth.uid() or public.is_admin()) with check(teacher_id=auth.uid() or public.is_admin());
create policy "Users read own certificates" on public.certificates for select using(student_id=auth.uid() or public.is_admin());
create policy "Settings read" on public.platform_settings for select using(true);
create policy "Admins manage settings" on public.platform_settings for all using(public.is_admin()) with check(public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.courses,public.modules,public.lessons to anon,authenticated;
grant select,update on public.profiles to authenticated;
grant select on public.enrollments,public.lesson_progress,public.payments,public.live_sessions,public.certificates,public.platform_settings to authenticated;
grant insert,update,delete on public.modules,public.lessons to authenticated;
grant insert,update,delete on public.courses to authenticated;
grant insert,update,delete on public.lesson_progress to authenticated;

-- Compatibility additions for existing deployments; safe to run more than once.
alter table public.courses add column if not exists category text not null default 'General';
alter table public.courses add column if not exists price_paise bigint not null default 0 check(price_paise>=0);
alter table public.courses drop constraint if exists courses_status_check;
alter table public.courses add constraint courses_status_check check(status in ('draft','pending','published','archived'));
