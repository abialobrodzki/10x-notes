-- migration: fix function search_path security warnings
-- purpose: set search_path to empty string for all security definer functions
-- scope: all security definer functions - security best practice
--
-- functions affected:
--   - get_tag_access_list
--   - grant_tag_access
--   - delete_user_account
--
-- special considerations:
--   - prevents search path injection attacks
--   - requires explicit schema qualification in function bodies
--   - supabase linter recommendation

-- fix get_tag_access_list function
create or replace function get_tag_access_list(p_tag_id uuid)
returns table (
  recipient_id uuid,
  email text,
  granted_at timestamptz
)
language plpgsql
security definer -- required to access auth.users
set search_path = '' -- fix: empty search_path for security
as $$
declare
  v_tag_owner_id uuid;
begin
  -- step 1: verify tag exists and get owner_id
  select user_id into v_tag_owner_id
  from public.tags
  where id = p_tag_id;

  -- if tag not found, raise exception
  if v_tag_owner_id is null then
    raise exception 'Tag not found';
  end if;

  -- step 2: verify current user is the tag owner
  if auth.uid() != v_tag_owner_id then
    raise exception 'Forbidden: Only tag owner can view access list';
  end if;

  -- step 3: return recipients with emails from auth.users
  return query
  select
    ta.recipient_id,
    coalesce(au.email, '')::text as email,
    ta.created_at as granted_at
  from public.tag_access ta
  left join auth.users au on au.id = ta.recipient_id
  where ta.tag_id = p_tag_id
  order by ta.created_at desc;
end;
$$;

-- fix grant_tag_access function
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
security definer -- required to access auth.users
set search_path = '' -- fix: empty search_path for security
as $$
declare
  v_tag_owner_id uuid;
  v_recipient_id uuid;
  v_recipient_email text;
  v_email_confirmed_at timestamptz;
  v_existing_access_id uuid;
  v_granted_at timestamptz;
begin
  -- step 1: verify tag exists and get owner_id
  select user_id into v_tag_owner_id
  from public.tags
  where id = p_tag_id;

  -- if tag not found, raise exception
  if v_tag_owner_id is null then
    raise exception 'Tag not found';
  end if;

  -- step 2: verify current user is the tag owner
  if auth.uid() != v_tag_owner_id then
    raise exception 'Forbidden: Only tag owner can grant access';
  end if;

  -- step 3: find recipient by email in auth.users
  select u.id, u.email, u.email_confirmed_at
  into v_recipient_id, v_recipient_email, v_email_confirmed_at
  from auth.users u
  where lower(u.email) = lower(p_recipient_email);

  -- if recipient not found, raise exception
  if v_recipient_id is null then
    raise exception 'User with this email not found';
  end if;

  -- step 4: check if recipient email is confirmed
  if v_email_confirmed_at is null then
    raise exception 'Recipient email not confirmed';
  end if;

  -- step 5: prevent self-sharing
  if v_recipient_id = auth.uid() then
    raise exception 'Cannot share tag with yourself';
  end if;

  -- step 6: check for duplicate access
  select ta.id into v_existing_access_id
  from public.tag_access ta
  where ta.tag_id = p_tag_id
    and ta.recipient_id = v_recipient_id;

  -- if access already exists, raise exception
  if v_existing_access_id is not null then
    raise exception 'Recipient already has access to this tag';
  end if;

  -- step 7: insert new access grant
  insert into public.tag_access (tag_id, recipient_id)
  values (p_tag_id, v_recipient_id)
  returning created_at into v_granted_at;

  -- step 8: return success result
  return query
  select
    v_recipient_id as recipient_id,
    v_recipient_email as email,
    v_granted_at as granted_at;
end;
$$;

-- fix delete_user_account function
create or replace function delete_user_account(
  p_user_id uuid,
  p_confirmation_email text
)
returns boolean
language plpgsql
security definer  -- executes with privileges of function owner (elevated)
set search_path = '' -- fix: empty search_path for security
as $$
declare
  v_user_email text;
begin
  -- step 1: get user email from auth.users
  select email into v_user_email
  from auth.users
  where id = p_user_id;

  -- check if user exists
  if v_user_email is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  -- step 2: validate confirmation email (case-insensitive)
  if lower(v_user_email) != lower(p_confirmation_email) then
    raise exception 'EMAIL_CONFIRMATION_MISMATCH';
  end if;

  -- step 3: delete all user data in correct order (respect fk constraints)
  -- cascade will handle public_links and owned tag_access automatically
  delete from public.notes where user_id = p_user_id;
  delete from public.tags where user_id = p_user_id;
  delete from public.tag_access where recipient_id = p_user_id;

  -- step 4: delete user from auth.users (requires security definer)
  delete from auth.users where id = p_user_id;

  return true;
end;
$$;

-- comment for documentation
comment on function get_tag_access_list(uuid) is
'retrieves list of users with access to a tag. security definer with empty search_path.';

comment on function grant_tag_access(uuid, text) is
'grants tag access to a user by email. security definer with empty search_path.';

comment on function delete_user_account(uuid, text) is
'deletes user account and all associated data. security definer with empty search_path.';
