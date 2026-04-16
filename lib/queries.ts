/**
 * Shared Supabase select strings.
 * Must live outside 'use server' files since those only allow async function exports.
 */

export const MESSAGE_SELECT =
  '*, profiles(username, avatar_url), replied_to:reply_to_id(id, content, user_id, profiles(username, avatar_url)), reactions:message_reactions(id, message_id, user_id, emoji, created_at, profiles(username))'
