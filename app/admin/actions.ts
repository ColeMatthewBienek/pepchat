'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/lib/permissions'

type ActionResult = { ok: true } | { error: string }

async function getAdminUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('group_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .limit(1)
    .single()

  return data ? user.id : null
}

async function logAudit(
  adminId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  metadata: Record<string, any>
) {
  const supabase = await createClient()
  await supabase.from('audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
  })
}

export async function changeRole(
  userId: string,
  groupId: string,
  newRole: Role,
  targetUsername: string,
  fromRole: Role,
): Promise<ActionResult> {
  const adminId = await getAdminUserId()
  if (!adminId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('group_members')
    .update({ role: newRole })
    .eq('user_id', userId)
    .eq('group_id', groupId)

  if (error) return { error: error.message }

  await logAudit(adminId, 'role_change', 'user', userId, {
    from_role: fromRole,
    to_role: newRole,
    target_username: targetUsername,
  })

  return { ok: true }
}

export async function banUser(
  userId: string,
  targetUsername: string,
  reason: string,
): Promise<ActionResult> {
  const adminId = await getAdminUserId()
  if (!adminId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('banned_users')
    .upsert({ user_id: userId, banned_by: adminId, reason })

  if (error) return { error: error.message }

  // Ban via Supabase Auth admin API if service role key available
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createAdminClient()
    await adminClient.auth.admin.updateUserById(userId, { ban_duration: '876600h' }) // ~100 years
  }

  await logAudit(adminId, 'ban', 'user', userId, { reason, target_username: targetUsername })
  return { ok: true }
}

export async function unbanUser(
  userId: string,
  targetUsername: string,
): Promise<ActionResult> {
  const adminId = await getAdminUserId()
  if (!adminId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('banned_users')
    .delete()
    .eq('user_id', userId)

  if (error) return { error: error.message }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createAdminClient()
    await adminClient.auth.admin.updateUserById(userId, { ban_duration: 'none' })
  }

  await logAudit(adminId, 'unban', 'user', userId, { target_username: targetUsername })
  return { ok: true }
}

export async function resetPassword(userId: string, email: string): Promise<ActionResult> {
  const adminId = await getAdminUserId()
  if (!adminId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function deleteGroup(
  groupId: string,
  groupName: string,
): Promise<ActionResult> {
  const adminId = await getAdminUserId()
  if (!adminId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  if (error) return { error: error.message }

  await logAudit(adminId, 'delete_group', 'group', groupId, { group_name: groupName })
  return { ok: true }
}

export async function transferOwnership(
  groupId: string,
  groupName: string,
  newOwnerId: string,
  fromUsername: string,
  toUsername: string,
): Promise<ActionResult> {
  const adminId = await getAdminUserId()
  if (!adminId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('groups')
    .update({ owner_id: newOwnerId })
    .eq('id', groupId)

  if (error) return { error: error.message }

  await logAudit(adminId, 'transfer_ownership', 'group', groupId, {
    group_name: groupName,
    from_user: fromUsername,
    to_user: toUsername,
  })
  return { ok: true }
}

export async function reportMessage(
  messageId: string,
  reason: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('reports')
    .insert({ message_id: messageId, reported_by: user.id, reason })

  if (error) return { error: error.message }
  return { ok: true }
}

export async function markReportReviewed(reportId: string): Promise<ActionResult> {
  const adminId = await getAdminUserId()
  if (!adminId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ status: 'reviewed' })
    .eq('id', reportId)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function dismissReport(reportId: string): Promise<ActionResult> {
  const adminId = await getAdminUserId()
  if (!adminId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ status: 'dismissed' })
    .eq('id', reportId)

  if (error) return { error: error.message }
  return { ok: true }
}
