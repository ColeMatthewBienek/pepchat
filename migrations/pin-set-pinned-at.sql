-- SECURITY DEFINER function so server actions can update pinned_at
-- on any message regardless of ownership RLS.
create or replace function set_message_pinned_at(
  p_message_id uuid,
  p_pinned_at  timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update messages set pinned_at = p_pinned_at where id = p_message_id;
end;
$$;

grant execute on function set_message_pinned_at(uuid, timestamptz) to authenticated;
