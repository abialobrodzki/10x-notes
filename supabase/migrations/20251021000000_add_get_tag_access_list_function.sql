-- ============================================================================
-- Migration: Add get_tag_access_list RPC function
-- ============================================================================
--
-- Purpose: Create RPC function to retrieve tag access list with user emails
--
-- Function: get_tag_access_list(p_tag_id uuid)
-- Returns: TABLE(recipient_id uuid, email text, granted_at timestamptz)
--
-- Security: Uses SECURITY DEFINER to access auth.users
-- Authorization: Only tag owner can retrieve access list (verified via auth.uid())
--
-- ============================================================================

create or replace function get_tag_access_list(p_tag_id uuid)
returns table (
  recipient_id uuid,
  email text,
  granted_at timestamptz
)
language plpgsql
security definer -- Required to access auth.users
set search_path = public, auth
as $$
declare
  v_tag_owner_id uuid;
begin
  -- Step 1: Verify tag exists and get owner_id
  select user_id into v_tag_owner_id
  from tags
  where id = p_tag_id;

  -- If tag not found, raise exception
  if v_tag_owner_id is null then
    raise exception 'Tag not found';
  end if;

  -- Step 2: Verify current user is the tag owner
  if auth.uid() != v_tag_owner_id then
    raise exception 'Forbidden: Only tag owner can view access list';
  end if;

  -- Step 3: Return recipients with emails from auth.users
  return query
  select
    ta.recipient_id,
    coalesce(au.email, '') as email,
    ta.created_at as granted_at
  from tag_access ta
  left join auth.users au on au.id = ta.recipient_id
  where ta.tag_id = p_tag_id
  order by ta.created_at desc;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function get_tag_access_list(uuid) to authenticated;

-- Revoke from anonymous users
revoke execute on function get_tag_access_list(uuid) from anon;

-- ============================================================================
-- Migration Complete
-- ============================================================================
