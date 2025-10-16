-- Cleanup legacy owner policies that still use auth.uid() per-row
-- Fixes: auth_rls_initplan + multiple_permissive_policies warnings

-- tags
drop policy if exists tags_owner_insert on tags;
drop policy if exists tags_owner_update on tags;
drop policy if exists tags_owner_delete on tags;

-- notes
drop policy if exists notes_owner_insert on notes;
drop policy if exists notes_owner_update on notes;
drop policy if exists notes_owner_delete on notes;

-- tag_access
drop policy if exists tag_access_owner_insert on tag_access;
drop policy if exists tag_access_owner_delete on tag_access;