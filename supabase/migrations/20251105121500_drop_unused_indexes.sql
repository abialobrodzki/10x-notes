-- ===========================================================================
-- Migration: Drop Unused Indexes
-- ===========================================================================
--
-- Description:
--   This migration addresses `unused_index` warnings from the Supabase
--   database linter.
--
-- Issue:
--   The indexes `idx_notes_user_meeting_date` and `idx_notes_goal_status`
--   on the `public.notes` table have been identified as unused.
--   Unused indexes consume disk space and add overhead to write operations
--   (INSERT, UPDATE, DELETE) without providing any query performance benefits.
--
-- Fix:
--   These indexes are being dropped to reduce database overhead and improve
--   write performance. If future query patterns require these indexes,
--   they can be re-added.
--
-- ===========================================================================

drop index if exists public.idx_notes_user_meeting_date;
drop index if exists public.idx_notes_goal_status;
