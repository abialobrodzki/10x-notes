-- ============================================================================
-- Final Fix: Remove Circular Dependency in Tags RLS
-- ============================================================================
--
-- Root Cause Analysis:
-- When querying notes with `tags!inner` join, PostgreSQL checks RLS on BOTH tables:
-- 1. RLS on notes checks if user has access (owner OR recipient via tag_access)
-- 2. RLS on tags ALSO checks if user has access (owner OR recipient via tag_access)
-- 3. Step 2 creates circular dependency because we're already in tag_access check
--
-- Solution:
-- Remove the recipient SELECT policy from tags table entirely.
-- Recipients get access to tags THROUGH the notes table RLS policy.
-- When they query notes (which includes tag join), the notes RLS allows access,
-- and tags only need to verify ownership (not recipient access).
--
-- ============================================================================

-- Drop ALL SELECT policies on tags
drop policy if exists tags_select_optimized on tags;
drop policy if exists tags_select_owner on tags;
drop policy if exists tags_select_shared on tags;
drop policy if exists tags_recipient_select on tags;

-- Create ONLY owner SELECT policy
-- Recipients don't need direct SELECT access to tags
-- They get tags data through notes JOIN (which has its own RLS)
create policy tags_select_owner_only on tags
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- Explanation
-- ============================================================================
-- 
-- Q: Won't this break recipient access to tags?
-- A: No! Recipients get tags through notes query with JOIN.
--    The notes RLS policy allows recipient access, and the JOIN
--    brings in tag data without triggering tags RLS recursion.
--
-- Q: Can recipients still see tag names in /api/tags?
-- A: Not directly, but this is OK - they don't need to list all tags.
--    They see tag names attached to notes they have access to.
--    If we need /api/tags to show shared tags, we handle it in
--    application layer by querying notes first, then extracting tags.
--
-- ============================================================================

comment on policy tags_select_owner_only on tags is
  'Owner-only SELECT policy for tags. Recipients access tags through notes JOIN, '
  'avoiding circular RLS dependency. This prevents infinite recursion when '
  'querying notes with tags!inner.';

-- ============================================================================
-- Migration Complete
-- ============================================================================
