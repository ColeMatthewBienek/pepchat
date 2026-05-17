-- Invite-only account gate: server-owned pending claims and atomic profile completion.

do $$
begin
  create type public.account_invite_claim_status as enum ('pending_profile', 'consumed', 'revoked');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.account_invite_claims (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.group_invites(id) on delete restrict,
  group_id uuid not null references public.groups(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  status public.account_invite_claim_status not null default 'pending_profile',
  claimed_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists idx_account_invite_claims_pending_user
  on public.account_invite_claims(auth_user_id)
  where status = 'pending_profile';

create unique index if not exists account_invite_claims_one_pending_per_user
  on public.account_invite_claims(auth_user_id)
  where status = 'pending_profile';

alter table public.account_invite_claims enable row level security;
revoke all on table public.account_invite_claims from anon, authenticated;
revoke all on table public.account_invite_claims from public;

drop policy if exists "Users can insert their own profile" on public.profiles;
revoke insert on table public.profiles from anon, authenticated;

create or replace function public.user_has_pending_account_invite_claim(p_auth_user_id uuid default auth.uid())
returns boolean
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if p_auth_user_id is null then
    p_auth_user_id := v_user_id;
  end if;

  if v_user_id is null or p_auth_user_id <> v_user_id then
    return false;
  end if;

  return exists (
    select 1
    from public.account_invite_claims c
    join public.group_invites i on i.id = c.invite_id
    where c.auth_user_id = p_auth_user_id
      and c.status = 'pending_profile'
      and i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
      and (i.max_uses is null or i.uses_count < i.max_uses)
  );
end;
$$;

create or replace function public.create_or_replace_account_invite_claim(
  p_invite_code text,
  p_auth_user_id uuid,
  p_email text
)
returns setof public.account_invite_claims
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invite public.group_invites%rowtype;
  v_group_owner uuid;
  v_creator_role public.member_role;
  v_claim public.account_invite_claims%rowtype;
begin
  select * into v_invite
  from public.group_invites
  where code = trim(p_invite_code)
  for update;

  if not found then
    raise exception 'Invite not found.';
  end if;

  if v_invite.revoked_at is not null
    or (v_invite.expires_at is not null and v_invite.expires_at <= now())
    or (v_invite.max_uses is not null and v_invite.uses_count >= v_invite.max_uses)
  then
    raise exception 'This invite is no longer valid. Ask an admin for a fresh link.';
  end if;

  select owner_id into v_group_owner from public.groups where id = v_invite.group_id;
  select role into v_creator_role
  from public.group_members
  where group_id = v_invite.group_id and user_id = v_invite.created_by
  limit 1;

  if v_invite.created_by is null
    or (v_invite.created_by <> v_group_owner and coalesce(v_creator_role::text, '') <> 'admin')
  then
    raise exception 'This invite is no longer valid. Ask an admin for a fresh link.';
  end if;

  update public.account_invite_claims
  set status = 'revoked'
  where auth_user_id = p_auth_user_id and status = 'pending_profile';

  insert into public.account_invite_claims(invite_id, group_id, auth_user_id, email)
  values (v_invite.id, v_invite.group_id, p_auth_user_id, lower(trim(p_email)))
  returning * into v_claim;

  return next v_claim;
end;
$$;

create or replace function public.complete_account_invite_profile(p_username text)
returns table(group_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_claim public.account_invite_claims%rowtype;
  v_invite public.group_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  select * into v_claim
  from public.account_invite_claims
  where auth_user_id = v_user_id and status = 'pending_profile'
  order by claimed_at desc
  limit 1
  for update;

  if not found then
    raise exception 'An invite is required to finish account setup.';
  end if;

  select * into v_invite
  from public.group_invites
  where id = v_claim.invite_id
  for update;

  if not found
    or v_invite.revoked_at is not null
    or (v_invite.expires_at is not null and v_invite.expires_at <= now())
    or (v_invite.max_uses is not null and v_invite.uses_count >= v_invite.max_uses)
  then
    raise exception 'This invite is no longer valid. Ask an admin for a fresh link.';
  end if;

  insert into public.profiles(id, username)
  values (v_user_id, trim(p_username));

  insert into public.group_members(group_id, user_id, role)
  values (v_claim.group_id, v_user_id, 'noob')
  on conflict (group_id, user_id) do nothing;

  insert into public.group_invite_uses(invite_id, group_id, user_id)
  values (v_invite.id, v_claim.group_id, v_user_id);

  update public.group_invites
  set uses_count = uses_count + 1
  where id = v_invite.id;

  update public.account_invite_claims
  set status = 'consumed', consumed_at = now()
  where id = v_claim.id;

  group_id := v_claim.group_id;
  return next;
end;
$$;

revoke all on function public.user_has_pending_account_invite_claim(uuid) from public;
revoke all on function public.create_or_replace_account_invite_claim(text, uuid, text) from public;
revoke all on function public.complete_account_invite_profile(text) from public;

grant execute on function public.user_has_pending_account_invite_claim(uuid) to authenticated;
grant execute on function public.complete_account_invite_profile(text) to authenticated;
grant execute on function public.create_or_replace_account_invite_claim(text, uuid, text) to service_role;
