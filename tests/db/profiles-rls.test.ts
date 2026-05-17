import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const migration = readFileSync(join(root, 'supabase/migrations/20260517000000_account_invite_claims.sql'), 'utf8')
const schema = readFileSync(join(root, 'schema.sql'), 'utf8')

describe('invite-only profile RLS schema', () => {
  it('uses executable PostgreSQL enum creation syntax in migration and schema', () => {
    expect(migration).not.toMatch(/create\s+type\s+if\s+not\s+exists/i)
    expect(schema).not.toMatch(/create\s+type\s+if\s+not\s+exists/i)
    expect(migration).toContain('exception\n  when duplicate_object then null;')
    expect(schema).toContain("create type public.account_invite_claim_status as enum ('pending_profile', 'consumed', 'revoked')")
  })

  it('removes the direct authenticated profile insert path in migration and schema', () => {
    expect(migration).toContain('drop policy if exists "Users can insert their own profile" on public.profiles')
    expect(migration).toContain('revoke insert on table public.profiles from anon, authenticated')
    expect(schema).not.toContain('create policy "Users can insert their own profile"')
    expect(schema).toContain('revoke insert on table public.profiles from anon, authenticated')
  })

  it('keeps account invite claims server-owned with no broad client DML privileges', () => {
    for (const sql of [migration, schema]) {
      expect(sql).toContain('create table if not exists public.account_invite_claims')
      expect(sql).toContain('alter table public.account_invite_claims enable row level security')
      expect(sql).toContain('revoke all on table public.account_invite_claims from anon, authenticated')
      expect(sql).toContain('account_invite_claims_one_pending_per_user')
    }
  })

  it('defines atomic first-account invite completion instead of direct table inserts from the app', () => {
    expect(migration).toContain('create or replace function public.complete_account_invite_profile')
    expect(migration).toContain('for update')
    expect(migration).toContain("insert into public.profiles(id, username)")
    expect(migration).toContain("insert into public.group_members(group_id, user_id, role)")
    expect(migration).toContain('insert into public.group_invite_uses')
    expect(migration).toContain("set status = 'consumed'")
    expect(migration).toContain('grant execute on function public.complete_account_invite_profile(text) to authenticated')
  })

  it('requires a completed profile before reading profile or group metadata', () => {
    for (const sql of [migration, schema]) {
      expect(sql).toContain('create or replace function public.user_has_profile')
      expect(sql).toContain('create or replace function public.users_share_group')
      expect(sql).toContain('create policy "Profiled users can read visible profiles"')
      expect(sql).toContain('public.user_has_profile()')
      expect(sql).toContain('or public.users_share_group(id)')
      expect(sql).toContain('create policy "Profiled users can read visible groups"')
      expect(sql).toContain('id = any(select public.get_user_group_ids())')
    }
    expect(migration).toContain('drop policy if exists "Profiles are viewable by authenticated users" on public.profiles')
    expect(migration).toContain('drop policy if exists "Authenticated users can read groups" on public.groups')
    expect(migration).toContain('drop policy if exists "Anyone can read groups to check invite codes" on public.groups')
    expect(schema).not.toContain('create policy "Profiles are viewable by authenticated users"')
    expect(schema).not.toContain('create policy "Authenticated users can read groups"')
  })

  it('blocks direct private group self-join while preserving public group self-join for profiled users', () => {
    expect(migration).toContain('drop policy if exists "Authenticated users can join groups" on public.group_members')
    for (const sql of [migration, schema]) {
      expect(sql).toContain('create policy "Authenticated users can join public groups"')
      expect(sql).toContain('public.user_has_profile()')
      expect(sql).toContain('groups.is_public = true')
      expect(sql).toContain('role = \'noob\'')
    }
    expect(schema).not.toContain('create policy "Authenticated users can join groups"')
  })

  it('restricts invite code enumeration and uses atomic RPCs for invite joins', () => {
    for (const sql of [migration, schema]) {
      expect(sql).toContain('create policy "Admins can read group invites"')
      expect(sql).not.toContain('create policy "Authenticated users can read group invites"')
      expect(sql).toContain('create or replace function public.consume_managed_group_invite')
      expect(sql).toContain('for update')
      expect(sql).toContain('grant execute on function public.consume_managed_group_invite(text) to authenticated')
      expect(sql).toContain('v_invite.max_uses is not null and v_invite.uses_count >= v_invite.max_uses')
    }
  })
})
