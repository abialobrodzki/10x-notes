-- ===========================================================================
-- Migration: Optimize RLS Policies for Performance
-- ===========================================================================
--
-- Description:
--   This migration addresses performance warnings from the Supabase linter
--   related to RLS policies (`auth_rls_initplan` and `multiple_permissive_policies`).
--
-- Fixes:
--   1. `auth_rls_initplan`: All calls to `auth.uid()` are wrapped in `(select auth.uid())`.
--      This ensures the function is evaluated only once per query, not per row,
--      significantly improving performance.
--
--   2. `multiple_permissive_policies`: Multiple permissive SELECT policies for
--      `notes` and `tags` are combined into single policies using OR logic.
--      This reduces the number of policies the database needs to evaluate.
--
-- ===========================================================================

-- Step 1: Drop the old, unoptimized policies
-- Note: We drop all policies that will be recreated or replaced.

-- Policies for `notes` table
drop policy if exists notes_select_owner on public.notes;
drop policy if exists notes_select_recipient on public.notes;
drop policy if exists notes_insert_owner on public.notes;
drop policy if exists notes_update_owner on public.notes;
drop policy if exists notes_delete_owner on public.notes;

-- Policies for `tags` table
drop policy if exists tags_select_owner on public.tags;
drop policy if exists tags_select_via_notes on public.tags;
drop policy if exists tags_insert_owner on public.tags;
drop policy if exists tags_update_owner on public.tags;
drop policy if exists tags_delete_owner on public.tags;

-- Policies for `tag_access` table
drop policy if exists tag_access_select_recipient on public.tag_access;
-- Note: `tag_access_delete_owner` was flagged but uses `using (true)`, so the optimization does not apply.
-- The check is performed at the application layer to prevent circular dependencies.

-- Policies for `public_links` table
drop policy if exists public_links_select_owner on public.public_links;
drop policy if exists public_links_insert_owner on public.public_links;
drop policy if exists public_links_update_owner on public.public_links;
drop policy if exists public_links_delete_owner on public.public_links;

-- Policies for `llm_generations` table
drop policy if exists llm_generations_select_user on public.llm_generations;
drop policy if exists allow_authenticated_insert_llm_generations on public.llm_generations;


-- Step 2: Recreate policies with performance optimizations

-- ============================================================================
-- Optimized `notes` policies
-- ============================================================================

-- COMBINED SELECT for owner and recipient
create policy notes_select_authenticated on public.notes
  for select
  to authenticated
  using (
    (user_id = (select auth.uid()))
    or
    (tag_id in (select tag_id from public.tag_access where recipient_id = (select auth.uid())))
  );

-- INSERT for owner
create policy notes_insert_owner on public.notes
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- UPDATE for owner
create policy notes_update_owner on public.notes
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- DELETE for owner
create policy notes_delete_owner on public.notes
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================================
-- Optimized `tags` policies
-- ============================================================================

-- COMBINED SELECT for owner and recipient (via notes)
create policy tags_select_authenticated on public.tags
  for select
  to authenticated
  using (
    (user_id = (select auth.uid()))
    or
    (id in (
      select distinct tag_id
      from public.notes
      where tag_id in (
        select tag_id
        from public.tag_access
        where recipient_id = (select auth.uid())
      )
    ))
  );

-- INSERT for owner
create policy tags_insert_owner on public.tags
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- UPDATE for owner
create policy tags_update_owner on public.tags
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- DELETE for owner
create policy tags_delete_owner on public.tags
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================================
-- Optimized `tag_access` policies
-- ============================================================================

-- SELECT for recipient
create policy tag_access_select_recipient on public.tag_access
  for select
  to authenticated
  using (recipient_id = (select auth.uid()));

-- ============================================================================
-- Optimized `public_links` policies
-- ============================================================================

-- SELECT for owner
create policy public_links_select_owner on public.public_links
  for select
  to authenticated
  using (note_id in (select id from public.notes where user_id = (select auth.uid())));

-- INSERT for owner
create policy public_links_insert_owner on public.public_links
  for insert
  to authenticated
  with check (note_id in (select id from public.notes where user_id = (select auth.uid())));

-- UPDATE for owner
create policy public_links_update_owner on public.public_links
  for update
  to authenticated
  using (note_id in (select id from public.notes where user_id = (select auth.uid())))
  with check (note_id in (select id from public.notes where user_id = (select auth.uid())));

-- DELETE for owner
create policy public_links_delete_owner on public.public_links
  for delete
  to authenticated
  using (note_id in (select id from public.notes where user_id = (select auth.uid())));

-- ============================================================================
-- Optimized `llm_generations` policies
-- ============================================================================

-- SELECT for user
create policy llm_generations_select_user on public.llm_generations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- INSERT for authenticated user
create policy allow_authenticated_insert_llm_generations on public.llm_generations
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));
