-- ============================================================================
-- Fix: Infinite Recursion in Tags RLS SELECT Policy
-- ============================================================================
--
-- Problem: tags_select_optimized uses EXISTS with tag_access subquery
-- which triggers infinite recursion when tags are accessed via JOIN
--
-- Solution: Split into TWO separate policies (owner + recipient)
-- PostgreSQL treats multiple permissive SELECT policies as OR conditions
--
-- ============================================================================

-- Drop the problematic combined policy
drop policy if exists tags_select_optimized on tags;

-- Create separate policies (no circular dependency)

-- Policy 1: Owners can see their own tags
create policy tags_select_owner on tags
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Policy 2: Recipients can see tags shared with them
-- Using simple IN subquery (not EXISTS) to avoid recursion
create policy tags_select_shared on tags
  for select
  to authenticated
  using (
    id in (
      select tag_id 
      from tag_access 
      where recipient_id = (select auth.uid())
    )
  );

-- ============================================================================
-- Migration Complete
-- ============================================================================
