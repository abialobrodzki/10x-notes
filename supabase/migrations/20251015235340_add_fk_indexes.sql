-- ============================================================================
-- add missing single-column indexes for foreign keys to improve performance
-- ============================================================================
-- purpose: add covering indexes for fk columns to speed up cascades and lookups
-- context: linter flagged unindexed foreign keys for tags.user_id, notes.user_id,
--          tag_access.recipient_id. while composite indexes exist, single-column
--          indexes are added to guarantee coverage and satisfy tooling.
-- notes:
-- - do not use CONCURRENTLY in migrations (wrapped in a transaction by cli)
-- - safe in prod: IF NOT EXISTS prevents errors on re-run
--
-- tables/columns affected:
-- - public.tags(user_id)
-- - public.notes(user_id)
-- - public.tag_access(recipient_id)
-- ============================================================================

-- tags.user_id fk -> auth.users(id)
create index if not exists idx_tags_user_id on public.tags(user_id);

-- notes.user_id fk -> auth.users(id)
create index if not exists idx_notes_user_id on public.notes(user_id);

-- tag_access.recipient_id fk -> auth.users(id)
create index if not exists idx_tag_access_recipient_id on public.tag_access(recipient_id);
