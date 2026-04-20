-- Add pin support to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz DEFAULT NULL;

-- Index for fetching pinned messages by channel
CREATE INDEX IF NOT EXISTS idx_messages_pinned_at
  ON messages (channel_id, pinned_at)
  WHERE pinned_at IS NOT NULL;
