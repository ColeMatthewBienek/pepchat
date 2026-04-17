export type Role = 'admin' | 'moderator' | 'user' | 'noob'

/**
 * Central permissions helper.
 * All role-gating in the UI goes through this object so rules
 * stay in one place and never diverge from the DB RLS policies.
 */
export const PERMISSIONS = {
  /** Can create, edit, and delete channels. */
  canManageChannels: (role: Role) =>
    (['admin', 'moderator'] as Role[]).includes(role),

  /** Can generate or revoke invite codes. */
  canGenerateInvite: (role: Role) =>
    (['admin', 'moderator'] as Role[]).includes(role),

  /** Can delete any message in the group (not just their own). */
  canDeleteAnyMessage: (role: Role) =>
    (['admin', 'moderator'] as Role[]).includes(role),

  /** Can delete their own messages. */
  canDeleteOwnMessage: (role: Role) =>
    (['admin', 'moderator', 'user'] as Role[]).includes(role),

  /** Can assign roles to other members. Admin only. */
  canAssignRoles: (role: Role) => role === 'admin',

  /** Can remove (kick) other members from the group. */
  canKickMembers: (role: Role) =>
    (['admin', 'moderator'] as Role[]).includes(role),

  /**
   * Can access a given channel.
   * Noobs are restricted to the channel named exactly 'welcome'.
   */
  canAccessChannel: (role: Role, channelName: string) => {
    if (role === 'noob') return channelName === 'welcome'
    return true
  },

  /** Can delete the group, update group settings. Admin only. */
  canManageGroup: (role: Role) => role === 'admin',

  /** Can react to messages. All roles including noob (noob restricted to welcome channel by RLS). */
  canReact: (role: Role) => (['admin', 'moderator', 'user', 'noob'] as Role[]).includes(role),

  /** Can send images. All roles (noob restricted to welcome channel by RLS). */
  canSendImages: (role: Role) => (['admin', 'moderator', 'user', 'noob'] as Role[]).includes(role),
} as const
