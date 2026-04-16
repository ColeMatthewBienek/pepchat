/** Supabase select string for messages — includes profile + replied-to joins. */
export const MESSAGE_SELECT =
  '*, profiles(username, avatar_url), replied_to:reply_to_id(id, content, user_id, profiles(username, avatar_url))'
