-- ============================================================================
-- FIX TAG_ACCESS DELETE POLICY - ADD OWNERSHIP CHECK
-- ============================================================================
--
-- Problem: tag_access_delete_owner policy has using (true) which allows
-- any authenticated user to delete any tag_access record.
--
-- Solution: Check ownership via tags table using IN subquery (safe, no recursion)
-- DELETE only triggers tag_access policy, not tags policy, so no circular dependency
--
-- ============================================================================

-- Drop existing policy
drop policy if exists tag_access_delete_owner on tag_access;

-- Recreate with proper ownership check
create policy tag_access_delete_owner on tag_access
  for delete
  to authenticated
  using (
    -- Only allow deletion if the current user is the owner of the tag
    -- Uses IN subquery to avoid circular dependency (one-way: tag_access → tags)
    tag_id in (
      select id from tags where user_id = auth.uid()
    )
  );
