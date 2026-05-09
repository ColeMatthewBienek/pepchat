create table if not exists public.group_invites (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups(id) on delete cascade not null,
  code       text unique not null,
  created_by uuid references public.profiles(id) on delete set null,
  max_uses   int check (max_uses is null or max_uses > 0),
  uses_count int not null default 0 check (uses_count >= 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now() not null
);

create table if not exists public.group_invite_uses (
  id         uuid primary key default gen_random_uuid(),
  invite_id  uuid references public.group_invites(id) on delete cascade not null,
  group_id   uuid references public.groups(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  used_at    timestamptz default now() not null
);

alter table public.group_invites enable row level security;
alter table public.group_invite_uses enable row level security;

create index if not exists idx_group_invites_group_created
  on public.group_invites(group_id, created_at desc);

create index if not exists idx_group_invites_active_code
  on public.group_invites(code) where revoked_at is null;

create index if not exists idx_group_invite_uses_invite
  on public.group_invite_uses(invite_id, used_at desc);

create policy "Authenticated users can read group invites"
  on public.group_invites for select to authenticated
  using (
    revoked_at is null
    or public.is_group_admin(group_id)
  );

create policy "Admins can create group invites"
  on public.group_invites for insert to authenticated
  with check (
    public.is_group_admin(group_id)
    and created_by = auth.uid()
  );

create policy "Admins can update group invites"
  on public.group_invites for update to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

create policy "Members can read invite usage for their groups"
  on public.group_invite_uses for select to authenticated
  using (
    group_id = any(select public.get_user_group_ids())
    or public.is_group_admin(group_id)
  );

create policy "Authenticated users can record their invite usage"
  on public.group_invite_uses for insert to authenticated
  with check (user_id = auth.uid());
