-- ============================================================================
-- CREATE GET_TAGS_SHARED_COUNTS RPC FUNCTION
-- ============================================================================
--
-- Problem: Owners cannot SELECT from tag_access table due to RLS policy
-- (only recipients can see their own grants).
-- This prevents fetching shared_recipients counts for notes list.
--
-- Solution: Create RPC function with SECURITY DEFINER that:
-- 1. Accepts array of tag IDs
-- 2. Verifies ownership for each tag (user must own the tag)
-- 3. Returns count of recipients per tag_id
--
-- ============================================================================

-- Create function to get shared recipients counts for owned tags
create or replace function get_tags_shared_counts(
  p_tag_ids uuid[]
)
returns table(tag_id uuid, recipients_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid;
begin
  -- Get current user ID from JWT
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Unauthorized: No user ID in JWT';
  end if;

  -- Return counts only for tags owned by current user
  -- This ensures users can only see counts for their own tags
  return query
    select
      ta.tag_id,
      count(ta.recipient_id) as recipients_count
    from public.tag_access ta
    inner join public.tags t on t.id = ta.tag_id
    where ta.tag_id = any(p_tag_ids)
      and t.user_id = v_current_user_id  -- Only owned tags
    group by ta.tag_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function get_tags_shared_counts(uuid[]) to authenticated;

-- Add comment
comment on function get_tags_shared_counts(uuid[]) is
  'Returns shared recipients counts for owned tags. Uses SECURITY DEFINER to bypass RLS on tag_access table.';
