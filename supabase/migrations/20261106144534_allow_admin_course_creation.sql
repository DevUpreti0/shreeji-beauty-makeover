drop policy if exists "teacher creates own courses" on public.courses;
create policy "teachers and admins create courses" on public.courses for insert to authenticated
with check (
  (teacher_id=(select auth.uid()) and public.current_user_role() in ('teacher','admin'))
  or public.current_user_role()='admin'
);
