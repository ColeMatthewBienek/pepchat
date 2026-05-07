-- Keep one report per reporter/message pair.
-- Preserve the oldest report when cleaning up historical duplicates.

delete from reports r
using (
  select
    ctid,
    row_number() over (
      partition by message_id, reported_by
      order by created_at asc, id asc
    ) as duplicate_rank
  from reports
  where message_id is not null
    and reported_by is not null
) ranked
where r.ctid = ranked.ctid
  and ranked.duplicate_rank > 1;

create unique index if not exists idx_reports_unique_message_reporter
  on reports(message_id, reported_by)
  where message_id is not null
    and reported_by is not null;
