-- Website CMS visibility and live support chat schema
grant select on public.platform_settings to anon;
drop policy if exists "public reads website content" on public.platform_settings;
create policy "public reads website content" on public.platform_settings
for select to anon, authenticated using (key = 'website_content');

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null default 'Website support',
  status text not null default 'open' check (status in ('open','pending','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists support_conversations_user_idx on public.support_conversations(user_id, updated_at desc);
create index if not exists support_messages_conversation_idx on public.support_messages(conversation_id, created_at);
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "users read own support conversations" on public.support_conversations;
create policy "users read own support conversations" on public.support_conversations
for select to authenticated using (user_id = auth.uid() or public.current_user_role() = 'admin');
drop policy if exists "users create own support conversations" on public.support_conversations;
create policy "users create own support conversations" on public.support_conversations
for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "admins update support conversations" on public.support_conversations;
create policy "admins update support conversations" on public.support_conversations
for update to authenticated using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists "users read messages in own conversations" on public.support_messages;
create policy "users read messages in own conversations" on public.support_messages
for select to authenticated using (
  exists (select 1 from public.support_conversations c
    where c.id = conversation_id and (c.user_id = auth.uid() or public.current_user_role() = 'admin'))
);
drop policy if exists "users send messages in own conversations" on public.support_messages;
create policy "users send messages in own conversations" on public.support_messages
for insert to authenticated with check (
  sender_id = auth.uid() and exists (
    select 1 from public.support_conversations c
    where c.id = conversation_id and (c.user_id = auth.uid() or public.current_user_role() = 'admin')
  )
);
grant select, insert on public.support_conversations to authenticated;
grant update on public.support_conversations to authenticated;
grant select, insert on public.support_messages to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.support_messages;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
