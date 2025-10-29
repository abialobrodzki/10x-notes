-- ============================================================================
-- COMPLETE RLS POLICIES REBUILD - NO RECURSION
-- ============================================================================
--
-- Strategy: Drop ALL existing policies and rebuild from scratch with safe patterns
-- This ensures no EXISTS/circular dependencies remain from previous migrations
--
-- ============================================================================

-- ============================================================================
-- 1. DROP ALL EXISTING POLICIES
-- ============================================================================

-- Tags table
drop policy if exists tags_owner_select on tags;
drop policy if exists tags_recipient_select on tags;
drop policy if exists tags_select_optimized on tags;
drop policy if exists tags_select_owner on tags;
drop policy if exists tags_select_shared on tags;
drop policy if exists tags_select_owner_only on tags;
drop policy if exists tags_select_recipient_safe on tags;
drop policy if exists tags_owner_insert_optimized on tags;
drop policy if exists tags_owner_update_optimized on tags;
drop policy if exists tags_owner_delete_optimized on tags;

-- Notes table
drop policy if exists notes_owner_select on notes;
drop policy if exists notes_recipient_select on notes;
drop policy if exists notes_select_optimized on notes;
drop policy if exists notes_select_owner_only on notes;
drop policy if exists notes_select_recipient_safe on notes;
drop policy if exists notes_owner_insert_optimized on notes;
drop policy if exists notes_owner_update_optimized on notes;
drop policy if exists notes_owner_delete_optimized on notes;

-- Tag access table
drop policy if exists tag_access_owner_select on tag_access;
drop policy if exists tag_access_recipient_select on tag_access;
drop policy if exists tag_access_select_optimized on tag_access;
drop policy if exists tag_access_select_owner on tag_access;
drop policy if exists tag_access_select_recipient on tag_access;
drop policy if exists tag_access_owner_insert on tag_access;
drop policy if exists tag_access_owner_insert_optimized on tag_access;
drop policy if exists tag_access_owner_delete on tag_access;
drop policy if exists tag_access_owner_delete_optimized on tag_access;

-- Public links table
drop policy if exists public_links_owner_select on public_links;
drop policy if exists public_links_owner_select_optimized on public_links;
drop policy if exists public_links_owner_insert on public_links;
drop policy if exists public_links_owner_insert_optimized on public_links;
drop policy if exists public_links_owner_update on public_links;
drop policy if exists public_links_owner_update_optimized on public_links;
drop policy if exists public_links_owner_delete on public_links;
drop policy if exists public_links_owner_delete_optimized on public_links;

-- LLM generations table
drop policy if exists llm_generations_user_select on llm_generations;
drop policy if exists llm_generations_user_select_optimized on llm_generations;

-- ============================================================================
-- 2. CREATE SAFE TAGS POLICIES
-- ============================================================================

-- SELECT: Owner can see their own tags
create policy tags_select_owner on tags
  for select
  to authenticated
  using (user_id = auth.uid());

-- SELECT: Recipient can see tags that are used in notes they have access to
-- SAFE: No circular dependency (notes → tag_access, not tags → tag_access)
create policy tags_select_via_notes on tags
  for select
  to authenticated
  using (
    id in (
      select distinct tag_id
      from notes
      where tag_id in (
        select tag_id
        from tag_access
        where recipient_id = auth.uid()
      )
    )
  );

-- INSERT: Only owner can create tags
create policy tags_insert_owner on tags
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: Only owner can update their tags
create policy tags_update_owner on tags
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE: Only owner can delete their tags
create policy tags_delete_owner on tags
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- 3. CREATE SAFE NOTES POLICIES
-- ============================================================================

-- SELECT: Owner can see their own notes
create policy notes_select_owner on notes
  for select
  to authenticated
  using (user_id = auth.uid());

-- SELECT: Recipient can see notes from shared tags
create policy notes_select_recipient on notes
  for select
  to authenticated
  using (
    tag_id in (
      select tag_id from tag_access where recipient_id = auth.uid()
    )
  );

-- INSERT: Only owner can create notes
create policy notes_insert_owner on notes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: Only owner can update their notes
create policy notes_update_owner on notes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE: Only owner can delete their notes
create policy notes_delete_owner on notes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- 4. CREATE SAFE TAG_ACCESS POLICIES
-- ============================================================================

-- SELECT: Only recipients can see their own access grants
-- NOTE: Tag owners use get_tag_access_list() RPC function (SECURITY DEFINER) to see grants
-- This avoids circular dependency (tag_access → tags → tag_access)
create policy tag_access_select_recipient on tag_access
  for select
  to authenticated
  using (recipient_id = auth.uid());

-- INSERT/DELETE: Use grant_tag_access() and revoke RPC functions (SECURITY DEFINER)
-- No INSERT/DELETE policies - forces use of RPC functions which avoid recursion

-- ============================================================================
-- 5. CREATE SAFE PUBLIC_LINKS POLICIES
-- ============================================================================

-- SELECT: Note owner can see public links
create policy public_links_select_owner on public_links
  for select
  to authenticated
  using (
    note_id in (
      select id from notes where user_id = auth.uid()
    )
  );

-- INSERT: Note owner can create public links
create policy public_links_insert_owner on public_links
  for insert
  to authenticated
  with check (
    note_id in (
      select id from notes where user_id = auth.uid()
    )
  );

-- UPDATE: Note owner can update public links
create policy public_links_update_owner on public_links
  for update
  to authenticated
  using (
    note_id in (
      select id from notes where user_id = auth.uid()
    )
  )
  with check (
    note_id in (
      select id from notes where user_id = auth.uid()
    )
  );

-- DELETE: Note owner can delete public links
create policy public_links_delete_owner on public_links
  for delete
  to authenticated
  using (
    note_id in (
      select id from notes where user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. CREATE SAFE LLM_GENERATIONS POLICIES
-- ============================================================================

-- SELECT: User can see their own generation logs
create policy llm_generations_select_user on llm_generations
  for select
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- All policies now use:
-- - Direct user_id = auth.uid() checks (no subquery overhead for owner checks)
-- - IN subqueries for cross-table checks (safe, no recursion)
-- - NO EXISTS clauses (they cause recursion with JOINs)
-- - Multiple permissive policies per action combine with OR logic
-- ============================================================================
