/** TypeScript interfaces matching the Supabase database schema. */

export interface ImageAttachment {
  url: string
  type: 'image'
  name: string
  size: number
  width?: number
  height?: number
}

export interface GifAttachment {
  url: string
  type: 'gif'
  name: string
  preview: string
  width: number
  height: number
  source: 'klipy'
}

export type Attachment = ImageAttachment | GifAttachment

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  display_name: string | null
  bio: string | null
  location: string | null
  website: string | null
  username_color: string
  banner_color: string
  badge: string | null
  pronouns: string | null
  member_since: string
  updated_at: string
  created_at: string
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'username' | 'member_since' | 'updated_at' | 'created_at'>>

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

/** Minimal shape of a quoted (replied-to) message. */
export interface QuotedMessage {
  id: string
  content: string
  user_id: string
  profiles: Pick<Profile, 'username' | 'avatar_url'>
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

export interface Message {
  id: string
  channel_id: string
  user_id: string
  content: string
  reply_to_id: string | null
  edited_at: string | null
  pinned_at?: string | null
  created_at: string
  attachments?: Attachment[]
  /** Joined from profiles — populated by select queries */
  profiles?: Pick<Profile, 'username' | 'avatar_url'>
  /** Joined quoted message — null when original was deleted */
  replied_to?: QuotedMessage | null
}

/** Message with the profiles join always present (used in chat components). */
export type MessageWithProfile = Message & {
  profiles: Pick<Profile, 'username' | 'avatar_url' | 'display_name'>
  replied_to?: QuotedMessage | null
  reactions?: Reaction[]
}

export interface DirectMessage {
  id: string
  conversation_id: string
  sender_id: string
  recipient_id: string
  content: string
  attachments: Attachment[]
  edited_at: string | null
  read_at: string | null
  created_at: string
}

export type DirectMessageWithProfile = DirectMessage & {
  sender: Profile
}

export type DMConversation = {
  id: string
  user_a: string
  user_b: string
  last_message: string | null
  last_message_at: string | null
  created_at: string
  other_user: Profile
  unread_count: number
}

export interface ChannelReadState {
  id: string
  user_id: string
  channel_id: string
  last_read_at: string
}

/** Presence payload for a single online user */
export interface PresenceUser {
  user_id: string
  username: string
  avatar_url: string | null
  online_at: string
}
