alter table public.channels
  add column if not exists noob_access boolean not null default false;

update public.channels
set noob_access = true
where name = 'welcome';

drop policy if exists "Members can view channels in their groups" on public.channels;
create policy "Members can view channels in their groups"
  on public.channels for select to authenticated
  using (
    group_id = any(select public.get_user_group_ids())
    and (
      public.get_user_role_in_group(group_id) != 'noob'
      or noob_access = true
      or name = 'welcome'
    )
  );

drop policy if exists "Members can read messages in their channels" on public.messages;
create policy "Members can read messages in their channels"
  on public.messages for select to authenticated
  using (
    channel_id in (
      select id from public.channels
      where group_id = any(select public.get_user_group_ids())
      and (
        public.get_user_role_in_group(group_id) <> 'noob'
        or noob_access = true
        or name = 'welcome'
      )
    )
  );

drop policy if exists "Members can insert messages as themselves" on public.messages;
create policy "Members can insert messages as themselves"
  on public.messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and channel_id in (
      select id from public.channels
      where group_id = any(select public.get_user_group_ids())
      and (
        public.get_user_role_in_group(group_id) <> 'noob'
        or noob_access = true
        or name = 'welcome'
      )
    )
  );

drop policy if exists "Members can view reactions in their channels" on public.message_reactions;
create policy "Members can view reactions in their channels"
  on public.message_reactions for select to authenticated
  using (
    message_id in (
      select m.id from public.messages m
      join public.channels c on c.id = m.channel_id
      where c.group_id = any(select public.get_user_group_ids())
      and (
        public.get_user_role_in_group(c.group_id) <> 'noob'
        or c.noob_access = true
        or c.name = 'welcome'
      )
    )
  );

drop policy if exists "Members can insert reactions as themselves" on public.message_reactions;
create policy "Members can insert reactions as themselves"
  on public.message_reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and message_id in (
      select m.id from public.messages m
      join public.channels c on c.id = m.channel_id
      where c.group_id = any(select public.get_user_group_ids())
      and (
        public.get_user_role_in_group(c.group_id) <> 'noob'
        or c.noob_access = true
        or c.name = 'welcome'
      )
    )
  );
