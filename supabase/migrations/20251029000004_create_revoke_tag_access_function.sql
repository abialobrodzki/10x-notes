-- ============================================================================
-- CREATE REVOKE_TAG_ACCESS RPC FUNCTION
-- ============================================================================
--
-- Problem: RLS DELETE policy on tag_access seems to not work correctly
-- when owner tries to delete access grants.
--
-- Solution: Create RPC function with SECURITY DEFINER that:
-- 1. Verifies tag ownership (tags table check)
-- 2. Deletes tag_access record with elevated privileges
-- 3. Returns success/error status
--
-- ============================================================================

-- Create function to revoke tag access
create or replace function revoke_tag_access(
  p_tag_id uuid,
  p_recipient_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tag_owner_id uuid;
  v_current_user_id uuid;
  v_deleted_count int;
begin
  -- Get current user ID from JWT
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Unauthorized: No user ID in JWT';
  end if;

  -- Step 1: Check if tag exists and get owner
  select user_id into v_tag_owner_id
  from public.tags
  where id = p_tag_id;

  if not found then
    raise exception 'Tag not found';
  end if;

  -- Step 2: Verify current user is the tag owner
  if v_tag_owner_id != v_current_user_id then
    raise exception 'Forbidden: Only tag owner can revoke access';
  end if;

  -- Step 3: Delete the tag_access record
  delete from public.tag_access
  where tag_id = p_tag_id
    and recipient_id = p_recipient_id;

  -- Get number of rows deleted
  get diagnostics v_deleted_count = row_count;

  -- Return success with metadata
  return jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'tag_id', p_tag_id,
    'recipient_id', p_recipient_id
  );

exception
  when others then
    -- Return error with message
    return jsonb_build_object(
      'success', false,
      'error', sqlerrm
    );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function revoke_tag_access(uuid, uuid) to authenticated;

-- Add comment
comment on function revoke_tag_access(uuid, uuid) is
  'Revokes tag access from a recipient. Only tag owner can revoke. Uses SECURITY DEFINER to bypass RLS.';
