drop policy if exists "published courses readable" on public.courses;
create policy "published courses public" on public.courses for select to anon using (status='published');
create policy "courses visible to signed in users" on public.courses for select to authenticated
using (status='published' or teacher_id=(select auth.uid()) or public.current_user_role()='admin');

drop policy if exists "modules visible for published or owned courses" on public.modules;
create policy "published modules public" on public.modules for select to anon
using (exists(select 1 from public.courses c where c.id=course_id and c.status='published'));
create policy "modules visible to signed in users" on public.modules for select to authenticated
using (exists(select 1 from public.courses c where c.id=course_id and (c.status='published' or c.teacher_id=(select auth.uid()) or public.current_user_role()='admin')));

drop policy if exists "lessons visible for published or owned courses" on public.lessons;
create policy "published lessons public" on public.lessons for select to anon
using (exists(select 1 from public.modules m join public.courses c on c.id=m.course_id where m.id=module_id and c.status='published'));
create policy "lessons visible to signed in users" on public.lessons for select to authenticated
using (exists(select 1 from public.modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.status='published' or c.teacher_id=(select auth.uid()) or public.current_user_role()='admin')));

revoke all on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated, service_role;
drop policy if exists "profiles update admin roles" on public.profiles;
create policy "profiles update admin roles" on public.profiles for update to authenticated
using (public.current_user_role()='admin')
with check (role in ('student','teacher'));
grant update(role) on public.profiles to authenticated;
