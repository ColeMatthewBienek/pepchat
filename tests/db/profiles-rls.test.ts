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
})
