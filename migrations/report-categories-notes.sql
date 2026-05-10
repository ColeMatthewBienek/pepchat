alter table reports
  add column if not exists category text,
  add column if not exists moderation_note text;
