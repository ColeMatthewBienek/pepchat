-- Admin dashboard tables

create table if not exists banned_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  banned_by  uuid references profiles(id),
  reason     text,
  banned_at  timestamptz default now(),
  unique(user_id)
);

alter table banned_users enable row level security;

create policy "admins can manage banned_users"
  on banned_users for all
  using (
    exists (
      select 1 from group_members
      where group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

-- -------------------------------------------------------

create table if not exists reports (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid references messages(id) on delete cascade,
  reported_by  uuid references profiles(id),
  reason       text,
  status       text default 'pending',
  created_at   timestamptz default now()
);

create unique index if not exists idx_reports_unique_message_reporter
  on reports(message_id, reported_by)
  where message_id is not null
    and reported_by is not null;

alter table reports enable row level security;

-- Anyone authenticated can insert a report
create policy "authenticated users can insert reports"
  on reports for insert
  to authenticated
  with check (auth.uid() = reported_by);

-- Only admins can read/update/delete reports
create policy "admins can manage reports"
  on reports for all
  using (
    exists (
      select 1 from group_members
      where group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

-- -------------------------------------------------------

create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references profiles(id),
  action      text not null,
  target_type text,
  target_id   uuid,
  metadata    jsonb,
  created_at  timestamptz default now()
);

create index if not exists idx_audit_log_created
  on audit_log(created_at desc);

alter table audit_log enable row level security;

create policy "admins can manage audit_log"
  on audit_log for all
  using (
    exists (
      select 1 from group_members
      where group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );
