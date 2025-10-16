-- ============================================================================
-- Optimization: RLS Policies Performance Enhancement
-- ============================================================================
--
-- Migration: Optimize RLS policies for better performance
-- Purpose: Fix auth.uid() re-evaluation and consolidate multiple permissive policies
-- Issues resolved:
--   1. auth_rls_initplan warnings - auth.uid() called for each row instead of once per query
--   2. multiple_permissive_policies warnings - separate owner/recipient policies cause overhead
--
-- Performance improvements:
--   - Replace auth.uid() with (select auth.uid()) - evaluates once per query
--   - Combine owner_select + recipient_select into single optimized policy
--   - Reduce policy evaluation overhead from N policies to 1 policy per action
--
-- ============================================================================

-- ============================================================================
-- 1. DROP EXISTING PROBLEMATIC POLICIES
-- ============================================================================
-- Remove policies that cause performance issues before recreating optimized versions

-- tags table policies
drop policy if exists tags_owner_select on tags;
drop policy if exists tags_recipient_select on tags;

-- notes table policies  
drop policy if exists notes_owner_select on notes;
drop policy if exists notes_recipient_select on notes;

-- tag_access table policies
drop policy if exists tag_access_owner_select on tag_access;
drop policy if exists tag_access_recipient_select on tag_access;

-- ============================================================================
-- 2. CREATE OPTIMIZED POLICIES - TAGS TABLE
-- ============================================================================
-- Combine owner + recipient access into single high-performance policy

-- optimized select policy: owner OR recipient access in single policy
create policy tags_select_optimized on tags
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id  -- owner access (evaluated once per query)
    or 
    exists (  -- recipient access via tag_access
      select 1 from tag_access ta
      where ta.tag_id = tags.id
        and ta.recipient_id = (select auth.uid())
    )
  );

-- other policies with optimized auth.uid() calls
create policy tags_owner_insert_optimized on tags
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy tags_owner_update_optimized on tags
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy tags_owner_delete_optimized on tags
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- 3. CREATE OPTIMIZED POLICIES - NOTES TABLE
-- ============================================================================
-- Combine owner + recipient access into single high-performance policy

-- optimized select policy: owner OR recipient access in single policy
create policy notes_select_optimized on notes
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id  -- owner access (evaluated once per query)
    or 
    exists (  -- recipient access via tag sharing
      select 1 from tag_access ta
      where ta.tag_id = notes.tag_id
        and ta.recipient_id = (select auth.uid())
    )
  );

-- other policies with optimized auth.uid() calls
create policy notes_owner_insert_optimized on notes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy notes_owner_update_optimized on notes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy notes_owner_delete_optimized on notes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- 4. CREATE OPTIMIZED POLICIES - TAG_ACCESS TABLE
-- ============================================================================
-- Combine owner + recipient access into single high-performance policy

-- optimized select policy: tag owner OR recipient access in single policy
create policy tag_access_select_optimized on tag_access
  for select
  to authenticated
  using (
    exists (  -- tag owner access
      select 1 from tags t
      where t.id = tag_access.tag_id
        and t.user_id = (select auth.uid())
    )
    or
    (select auth.uid()) = recipient_id  -- recipient access
  );

-- other policies with optimized auth.uid() calls
create policy tag_access_owner_insert_optimized on tag_access
  for insert
  to authenticated
  with check (
    exists (
      select 1 from tags t
      where t.id = tag_access.tag_id
        and t.user_id = (select auth.uid())
    )
  );

create policy tag_access_owner_delete_optimized on tag_access
  for delete
  to authenticated
  using (
    exists (
      select 1 from tags t
      where t.id = tag_access.tag_id
        and t.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 5. OPTIMIZE REMAINING POLICIES - PUBLIC_LINKS & LLM_GENERATIONS
-- ============================================================================
-- Fix auth.uid() performance issues in remaining policies

-- drop and recreate public_links policies with optimized auth.uid()
drop policy if exists public_links_owner_select on public_links;
drop policy if exists public_links_owner_insert on public_links;
drop policy if exists public_links_owner_update on public_links;
drop policy if exists public_links_owner_delete on public_links;

create policy public_links_owner_select_optimized on public_links
  for select
  to authenticated
  using (
    exists (
      select 1 from notes n
      where n.id = public_links.note_id
        and n.user_id = (select auth.uid())
    )
  );

create policy public_links_owner_insert_optimized on public_links
  for insert
  to authenticated
  with check (
    exists (
      select 1 from notes n
      where n.id = public_links.note_id
        and n.user_id = (select auth.uid())
    )
  );

create policy public_links_owner_update_optimized on public_links
  for update
  to authenticated
  using (
    exists (
      select 1 from notes n
      where n.id = public_links.note_id
        and n.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from notes n
      where n.id = public_links.note_id
        and n.user_id = (select auth.uid())
    )
  );

create policy public_links_owner_delete_optimized on public_links
  for delete
  to authenticated
  using (
    exists (
      select 1 from notes n
      where n.id = public_links.note_id
        and n.user_id = (select auth.uid())
    )
  );

-- drop and recreate llm_generations policy with optimized auth.uid()
drop policy if exists llm_generations_user_select on llm_generations;

create policy llm_generations_user_select_optimized on llm_generations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- Migration Complete - Performance Optimizations Applied
-- ============================================================================