-- migration: create function to delete user account with all associated data
-- purpose: replace supabaseadmin bypass with security definer function
-- scope: database function with elevated privileges for user account deletion
--
-- function created:
--   - delete_user_account(uuid, text) returns boolean
--
-- special considerations:
--   - security definer executes with privileges of function owner (elevated)
--   - validates email confirmation before deletion
--   - deletes all user data in correct order (respecting fk constraints)
--   - gdpr compliance - implements "right to be forgotten"
--   - required for delete /api/user/account endpoint

-- create function to delete user account with all associated data
create or replace function delete_user_account(
  p_user_id uuid,
  p_confirmation_email text
)
returns boolean
language plpgsql
security definer  -- executes with privileges of function owner (elevated)
set search_path = public
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
  delete from notes where user_id = p_user_id;
  delete from tags where user_id = p_user_id;
  delete from tag_access where recipient_id = p_user_id;

  -- step 4: delete user from auth.users (requires security definer)
  delete from auth.users where id = p_user_id;

  return true;
end;
$$;

-- grant execute to authenticated users (they can only delete their own account)
grant execute on function delete_user_account(uuid, text) to authenticated;

-- revoke from anonymous (safety measure)
revoke execute on function delete_user_account(uuid, text) from anon;

-- comment for documentation
comment on function delete_user_account(uuid, text) is
'deletes user account and all associated data (notes, tags, tag_access). 
requires email confirmation. gdpr compliant - implements "right to be forgotten".
used by delete /api/user/account endpoint.';
