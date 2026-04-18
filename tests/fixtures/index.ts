import type { Profile, Group, Channel, GroupMember, MessageWithProfile, DirectMessageWithProfile, DMConversation } from '@/lib/types'

export const PROFILE_A: Profile = {
  id: 'user-a',
  username: 'alice',
  avatar_url: 'https://example.com/alice.jpg',
  display_name: 'Alice',
  bio: null,
  location: null,
  website: null,
  username_color: '#ffffff',
  banner_color: '#000000',
  badge: null,
  pronouns: null,
  member_since: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
}

export const PROFILE_B: Profile = {
  id: 'user-b',
  username: 'bob',
  avatar_url: null,
  display_name: 'Bob',
  bio: null,
  location: null,
  website: null,
  username_color: '#aabbcc',
  banner_color: '#112233',
  badge: null,
  pronouns: 'he/him',
  member_since: '2024-02-01T00:00:00Z',
  updated_at: '2024-02-01T00:00:00Z',
  created_at: '2024-02-01T00:00:00Z',
}

export const GROUP: Group = {
  id: 'group-1',
  name: 'Test Group',
  description: 'A test group',
  icon_url: null,
  owner_id: PROFILE_A.id,
  invite_code: 'TESTCODE',
  created_at: '2024-01-01T00:00:00Z',
}

export const CHANNEL: Channel = {
  id: 'channel-1',
  group_id: GROUP.id,
  name: 'general',
  description: null,
  position: 0,
  created_at: '2024-01-01T00:00:00Z',
}

export const WELCOME_CHANNEL: Channel = {
  ...CHANNEL,
  id: 'channel-welcome',
  name: 'welcome',
}

export const MEMBER_ADMIN: GroupMember = {
  id: 'member-a',
  group_id: GROUP.id,
  user_id: PROFILE_A.id,
  role: 'admin',
  joined_at: '2024-01-01T00:00:00Z',
}

export const MEMBER_NOOB: GroupMember = {
  id: 'member-b',
  group_id: GROUP.id,
  user_id: PROFILE_B.id,
  role: 'noob',
  joined_at: '2024-02-01T00:00:00Z',
}

export const MESSAGE: MessageWithProfile = {
  id: 'msg-1',
  channel_id: CHANNEL.id,
  user_id: PROFILE_A.id,
  content: 'Hello world',
  reply_to_id: null,
  edited_at: null,
  created_at: '2024-01-15T12:00:00Z',
  attachments: [],
  profiles: {
    username: PROFILE_A.username,
    avatar_url: PROFILE_A.avatar_url,
    display_name: PROFILE_A.display_name,
  },
  reactions: [],
  replied_to: null,
}

export const DM_MESSAGE: DirectMessageWithProfile = {
  id: 'dm-1',
  conversation_id: 'conv-1',
  sender_id: PROFILE_A.id,
  recipient_id: PROFILE_B.id,
  content: 'Hey Bob!',
  attachments: [],
  edited_at: null,
  read_at: null,
  created_at: '2024-03-01T10:00:00Z',
  sender: PROFILE_A,
}
