/** TypeScript interfaces matching the Supabase database schema. */

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  created_at: string
}

export interface Group {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  owner_id: string
  invite_code: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'moderator' | 'user' | 'noob'
  joined_at: string
  /** Joined from profiles — populated by select queries */
  profiles?: Pick<Profile, 'username' | 'avatar_url'>
}

export interface Channel {
  id: string
  group_id: string
  name: string
  description: string | null
  position: number
  created_at: string
}

export interface Message {
  id: string
  channel_id: string
  user_id: string
  content: string
  edited_at: string | null
  created_at: string
  /** Joined from profiles — populated by select queries */
  profiles?: Pick<Profile, 'username' | 'avatar_url'>
}

/** Message with the profiles join always present (used in chat components). */
export type MessageWithProfile = Message & {
  profiles: Pick<Profile, 'username' | 'avatar_url'>
  reactions?: Reaction[]
}

export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  /** Joined from profiles — populated by select queries */
  profiles?: Pick<Profile, 'username'>
}

export interface DirectMessage {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read_at: string | null
  created_at: string
}

/** Presence payload for a single online user */
export interface PresenceUser {
  user_id: string
  username: string
  avatar_url: string | null
  online_at: string
}
