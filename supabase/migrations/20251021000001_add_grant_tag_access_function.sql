-- ============================================================================
-- Migration: Add grant_tag_access RPC function
-- ============================================================================
--
-- Purpose: Create RPC function to grant tag access to another user by email
--
-- Function: grant_tag_access(p_tag_id uuid, p_recipient_email text)
-- Returns: TABLE(recipient_id uuid, email text, granted_at timestamptz)
--
-- Security: Uses SECURITY DEFINER to access auth.users
-- Authorization: Only tag owner can grant access (verified via auth.uid())
--
-- Validations:
-- - Tag must exist and current user must be owner
-- - Recipient must exist in auth.users
-- - Recipient email must be confirmed
-- - Cannot share with self
-- - Prevents duplicate access grants
--
-- ============================================================================

create or replace function grant_tag_access(
  p_tag_id uuid,
  p_recipient_email text
)
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
  v_recipient_id uuid;
  v_recipient_email text;
  v_email_confirmed_at timestamptz;
  v_existing_access_id uuid;
  v_granted_at timestamptz;
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
    raise exception 'Forbidden: Only tag owner can grant access';
  end if;

  -- Step 3: Find recipient by email in auth.users
  select id, email, email_confirmed_at
  into v_recipient_id, v_recipient_email, v_email_confirmed_at
  from auth.users
  where lower(email) = lower(p_recipient_email);

  -- If recipient not found, raise exception
  if v_recipient_id is null then
    raise exception 'User with this email not found';
  end if;

  -- Step 4: Check if recipient email is confirmed
  if v_email_confirmed_at is null then
    raise exception 'Recipient email not confirmed';
  end if;

  -- Step 5: Prevent self-sharing
  if v_recipient_id = auth.uid() then
    raise exception 'Cannot share tag with yourself';
  end if;

  -- Step 6: Check for duplicate access
  select id into v_existing_access_id
  from tag_access
  where tag_id = p_tag_id
    and recipient_id = v_recipient_id;

  -- If access already exists, raise exception
  if v_existing_access_id is not null then
    raise exception 'Recipient already has access to this tag';
  end if;

  -- Step 7: Insert new access grant
  insert into tag_access (tag_id, recipient_id)
  values (p_tag_id, v_recipient_id)
  returning created_at into v_granted_at;

  -- Step 8: Return success result
  return query
  select
    v_recipient_id as recipient_id,
    v_recipient_email as email,
    v_granted_at as granted_at;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function grant_tag_access(uuid, text) to authenticated;

-- Revoke from anonymous users
revoke execute on function grant_tag_access(uuid, text) from anon;

-- ============================================================================
-- Migration Complete
-- ============================================================================
