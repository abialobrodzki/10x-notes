-- ============================================================================
-- 10xNotes MVP - Complete Database Schema Migration
-- ============================================================================
--
-- Migration: Create complete database schema for 10xNotes MVP
-- Purpose: Initialize all tables, enums, indexes, views, RLS policies, and triggers
-- Scope: AI-powered meeting notes app with smart summarization, tagging, and sharing
-- 
-- Tables affected:
--   - tags (project/category organization)
--   - notes (core meeting notes with AI summaries)
--   - tag_access (N:M relationship for sharing access)
--   - public_links (public sharing tokens)
--   - llm_generations (AI generation logging for monitoring)
--
-- Special considerations:
--   - Row Level Security (RLS) enabled on all tables
--   - Multi-layered access control (owner, recipient, public link)
--   - CHECK constraints for data validation
--   - Cascade/Restrict strategies for referential integrity
--   - Composite indexes for performance optimization
--
-- ============================================================================

-- Pre-migration checks: ensure extensions and clean up deprecated items
create extension if not exists pgcrypto;

-- Remove deprecated public link policy if it exists (replaced by API endpoint approach)
-- drop policy if exists notes_public_link_policy on notes; -- Disabled - table doesn't exist yet

-- Remove deprecated indexes if they exist (replaced by composite indexes or removed as unused)
drop index if exists idx_public_links_token;      -- covered by unique constraint on token
drop index if exists idx_notes_user_id;           -- covered by composite idx_notes_user_meeting_date
drop index if exists idx_notes_meeting_date;      -- not used in mvp scope (all queries scoped to user)
drop index if exists idx_tag_access_recipient_id; -- covered by composite idx_tag_access_recipient_tag
drop index if exists idx_tags_user_id;            -- covered by composite unique_tag_name_per_user

-- ============================================================================
-- 1. ENUM TYPE: goal_status_enum
-- ============================================================================
-- Defines the possible values for meeting goal achievement status
-- Used in notes.goal_status column to track whether meeting goals were achieved

create type goal_status_enum as enum (
  'achieved',      -- goal was successfully achieved
  'not_achieved',  -- goal was not achieved
  'undefined'      -- cannot determine goal status from notes (requires manual assessment)
);

-- ============================================================================
-- 2. TABLE: tags
-- ============================================================================
-- Project/category tags for organizing notes
-- Tags are unique per user (case-insensitive)
-- Used as basis for access control - sharing a tag gives recipients access to all associated notes

create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  
  -- constraint: tags must be unique per user (enforced by unique index below)
);

-- enable row level security on tags table
alter table tags enable row level security;

-- index on user_id for efficient tag listing per user
-- note: composite unique index (user_id, lower(name)) also serves this purpose via leftmost prefix rule
create unique index unique_tag_name_per_user on tags(user_id, lower(name));

-- ============================================================================
-- 3. TABLE: notes
-- ============================================================================
-- Core table storing original meeting notes and AI-generated summaries
-- Each note must have exactly one tag (1:N relationship with tags)
-- Original content limited to 5000 characters (validated at DB level + UI level)

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete restrict, -- restrict prevents accidental tag deletion with notes
  original_content text not null,
  summary_text text,
  goal_status goal_status_enum,
  suggested_tag text,
  meeting_date date not null default current_date,
  is_ai_generated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- check constraints for content length validation
  -- original_content: max 5000 chars (user requirement)
  constraint notes_original_content_max_length check (char_length(original_content) <= 5000),
  
  -- summary_text: max 2000 chars (approx 200 words with buffer)
  constraint notes_summary_text_max_length check (char_length(summary_text) <= 2000)
);

-- enable row level security on notes table
alter table notes enable row level security;

-- indexes for common query patterns
create index idx_notes_tag_id on notes(tag_id);                              -- filter by tag
-- composite index: covers both (user_id, meeting_date) queries and single user_id queries via leftmost prefix
create index idx_notes_user_meeting_date on notes(user_id, meeting_date desc);
create index idx_notes_goal_status on notes(goal_status);                    -- filter by goal status (MVP requirement per PRD)

-- ============================================================================
-- 4. TABLE: tag_access
-- ============================================================================
-- N:M junction table for sharing access
-- When a tag is shared with a recipient, that recipient can view all notes under that tag
-- Prevents duplicate access grants with unique constraint

create table tag_access (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references tags(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- constraint: prevent duplicate access grants for same tag-recipient pair
  constraint tag_access_unique_grant unique (tag_id, recipient_id)
);

-- enable row level security on tag_access table
alter table tag_access enable row level security;

-- indexes for access lookups
create index idx_tag_access_tag_id on tag_access(tag_id);                    -- filter by tag
-- composite index: covers both (recipient_id, tag_id) queries and single recipient_id queries
create index idx_tag_access_recipient_tag on tag_access(recipient_id, tag_id);

-- ============================================================================
-- 5. TABLE: public_links
-- ============================================================================
-- Public sharing links for individual notes
-- Each note can have at most one public link (1:1 relationship)
-- Contains UUID token for secure, unguessable URLs
-- is_enabled flag allows soft disabling without deletion

create table public_links (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null unique references notes(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable row level security on public_links table
alter table public_links enable row level security;

-- note: no explicit index needed for token column
-- the unique constraint on token already creates an index automatically in postgresql

-- ============================================================================
-- 6. TABLE: llm_generations
-- ============================================================================
-- Logging table for AI model invocations
-- Used for monitoring, analytics, performance tracking, and cost analysis
-- Preserves logs even if associated note is deleted (set null on delete)

create table llm_generations (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete set null,           -- null if generation failed before save
  user_id uuid references auth.users(id) on delete set null,      -- null for anonymous generations
  model_name text not null,                                        -- e.g., "openai/gpt-5-nano"
  generation_time_ms integer not null,
  tokens_used integer,
  status text not null,
  error_message text,
  created_at timestamptz not null default now(),
  
  -- check constraints for data validation
  -- generation_time_ms: must be non-negative (seconds cannot be negative)
  constraint llm_generations_time_non_negative check (generation_time_ms >= 0),
  
  -- tokens_used: must be non-negative if present (null allowed for models not reporting tokens)
  constraint llm_generations_tokens_non_negative check (tokens_used is null or tokens_used >= 0),
  
  -- status: restricted to success or failure (other states handled by application)
  constraint llm_generations_status_valid check (status in ('success', 'failure'))
);

-- enable row level security on llm_generations table
alter table llm_generations enable row level security;

-- indexes for analytics and monitoring queries
create index idx_llm_generations_user_id on llm_generations(user_id);       -- find user's generation history
create index idx_llm_generations_note_id on llm_generations(note_id);       -- find generations for note

-- ============================================================================
-- 7. VIEW: user_generation_stats
-- ============================================================================
-- Aggregated statistics for ai generation usage per user
-- Pre-calculated metrics for dashboard and analytics
-- uses coalesce to handle null tokens_used values (some models don't report)

create view user_generation_stats as
select
  user_id,
  count(*) as total_generations,
  avg(generation_time_ms) as avg_time_ms,
  sum(coalesce(tokens_used, 0)) as total_tokens,                                         -- null treated as 0
  sum(case when status = 'success' then 1 else 0 end) as successful_generations,
  sum(case when status = 'failure' then 1 else 0 end) as failed_generations
from llm_generations
where user_id is not null
group by user_id;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Multi-layered security: owner, recipient, and public access patterns
-- RLS enforces these policies at database level, preventing unauthorized access

-- ============================================================================
-- 8.1 tags - RLS Policies
-- ============================================================================
-- owner: full access to own tags (create, read, update, delete)
-- recipient: read-only access to tags shared with them (select only)
-- anon: no access

-- policy 1a: owner can select own tags
create policy tags_owner_select on tags
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy 1b: owner can insert tags
create policy tags_owner_insert on tags
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy 1c: owner can update own tags
create policy tags_owner_update on tags
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- policy 1d: owner can delete own tags
create policy tags_owner_delete on tags
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- policy 2: recipient can read tags they have access to (via tag_access)
-- read-only: select only, no insert/update/delete
create policy tags_recipient_select on tags
  for select
  to authenticated
  using (
    exists (
      select 1 from tag_access ta
      where ta.tag_id = tags.id
        and ta.recipient_id = auth.uid()
    )
  );

-- policy 3: anonymous users have no access to tags
create policy tags_anon_select on tags
  for select
  to anon
  using (false);

create policy tags_anon_insert on tags
  for insert
  to anon
  with check (false);

create policy tags_anon_update on tags
  for update
  to anon
  using (false)
  with check (false);

create policy tags_anon_delete on tags
  for delete
  to anon
  using (false);

-- ============================================================================
-- 8.2 notes - RLS Policies
-- ============================================================================
-- owner: full access to own notes (select, insert, update, delete)
-- recipient: read-only access to notes shared via tag access (select only)
-- public: access via api endpoint only (not through rls - see design rationale)
-- anon: no access through rls (public links via api endpoint only)

-- policy 1a: owner can select own notes
create policy notes_owner_select on notes
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy 1b: owner can insert own notes
create policy notes_owner_insert on notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy 1c: owner can update own notes
create policy notes_owner_update on notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- policy 1d: owner can delete own notes
create policy notes_owner_delete on notes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- policy 2: recipients can read notes whose tags they have access to (select only)
-- read-only: no insert/update/delete for recipients
create policy notes_recipient_select on notes
  for select
  to authenticated
  using (
    exists (
      select 1 from tag_access ta
      where ta.tag_id = notes.tag_id
        and ta.recipient_id = auth.uid()
    )
  );

-- policy 3: anonymous users have no rls access (public links use api endpoint with service role)
create policy notes_anon_select on notes
  for select
  to anon
  using (false);

create policy notes_anon_insert on notes
  for insert
  to anon
  with check (false);

create policy notes_anon_update on notes
  for update
  to anon
  using (false)
  with check (false);

create policy notes_anon_delete on notes
  for delete
  to anon
  using (false);

-- note: public link access is NOT handled by rls policies
-- instead, public notes are accessed through an api endpoint that uses service role key
-- this prevents authenticated users from viewing full content of public notes via rls

-- ============================================================================
-- 8.3 tag_access - RLS Policies
-- ============================================================================
-- owner: can manage (create, select, delete) access permissions for their tags
-- recipient: can select only their own access records (read-only)
-- anon: no access

-- policy 1a: tag owner can select access grants for their tags
create policy tag_access_owner_select on tag_access
  for select
  to authenticated
  using (
    exists (
      select 1 from tags t
      where t.id = tag_access.tag_id
        and t.user_id = auth.uid()
    )
  );

-- policy 1b: tag owner can create access grants for their tags
create policy tag_access_owner_insert on tag_access
  for insert
  to authenticated
  with check (
    exists (
      select 1 from tags t
      where t.id = tag_access.tag_id
        and t.user_id = auth.uid()
    )
  );

-- policy 1c: tag owner can delete access grants for their tags
create policy tag_access_owner_delete on tag_access
  for delete
  to authenticated
  using (
    exists (
      select 1 from tags t
      where t.id = tag_access.tag_id
        and t.user_id = auth.uid()
    )
  );

-- policy 2: recipients can select only their own access records (read-only)
-- no insert/update/delete for recipients
create policy tag_access_recipient_select on tag_access
  for select
  to authenticated
  using (auth.uid() = recipient_id);

-- policy 3: anonymous users have no access
create policy tag_access_anon_select on tag_access
  for select
  to anon
  using (false);

create policy tag_access_anon_insert on tag_access
  for insert
  to anon
  with check (false);

create policy tag_access_anon_update on tag_access
  for update
  to anon
  using (false)
  with check (false);

create policy tag_access_anon_delete on tag_access
  for delete
  to anon
  using (false);

-- ============================================================================
-- 8.4 public_links - RLS Policies
-- ============================================================================
-- owner: full access to manage public links for their notes (select, insert, update, delete)
-- recipient: no access (read access via public api endpoint with service role key)
-- anon: no access (read access via public api endpoint)

-- policy 1a: owner can select public links for their notes
create policy public_links_owner_select on public_links
  for select
  to authenticated
  using (
    exists (
      select 1 from notes n
      where n.id = public_links.note_id
        and n.user_id = auth.uid()
    )
  );

-- policy 1b: owner can create public links for their notes
create policy public_links_owner_insert on public_links
  for insert
  to authenticated
  with check (
    exists (
      select 1 from notes n
      where n.id = public_links.note_id
        and n.user_id = auth.uid()
    )
  );

-- policy 1c: owner can update public links for their notes
create policy public_links_owner_update on public_links
  for update
  to authenticated
  using (
    exists (
      select 1 from notes n
      where n.id = public_links.note_id
        and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from notes n
      where n.id = public_links.note_id
        and n.user_id = auth.uid()
    )
  );

-- policy 1d: owner can delete public links for their notes
create policy public_links_owner_delete on public_links
  for delete
  to authenticated
  using (
    exists (
      select 1 from notes n
      where n.id = public_links.note_id
        and n.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 8.5 llm_generations - RLS Policies
-- ============================================================================
-- user: can select only their own generation logs (read-only)
-- note: insert/update/delete operations must be performed by backend using service role key
-- anon: no access

-- policy 1: authenticated users can select only their own generation logs
-- anonymous generations (user_id is null) are NOT accessible through rls
-- this prevents authenticated users from accessing other users' anonymous logs (privacy)
create policy llm_generations_user_select on llm_generations
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy 2: anonymous users have no access to llm_generations
-- insert/update/delete handled by backend with service role key
create policy llm_generations_anon_select on llm_generations
  for select
  to anon
  using (false);

create policy llm_generations_anon_insert on llm_generations
  for insert
  to anon
  with check (false);

create policy llm_generations_anon_update on llm_generations
  for update
  to anon
  using (false)
  with check (false);

create policy llm_generations_anon_delete on llm_generations
  for delete
  to anon
  using (false);

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================
-- Triggers for automatic updates and data cleanup

-- ============================================================================
-- 9.1 updated_at Trigger Function
-- ============================================================================
-- Automatically updates updated_at column to current timestamp on every update
-- Applied to all temporal tables: tags, notes, tag_access, public_links

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = '';

-- apply trigger to tags table
create trigger set_tags_updated_at
  before update on tags
  for each row
  execute function set_updated_at();

-- apply trigger to notes table
create trigger set_notes_updated_at
  before update on notes
  for each row
  execute function set_updated_at();

-- apply trigger to tag_access table
create trigger set_tag_access_updated_at
  before update on tag_access
  for each row
  execute function set_updated_at();

-- apply trigger to public_links table
create trigger set_public_links_updated_at
  before update on public_links
  for each row
  execute function set_updated_at();

-- ============================================================================
-- 9.2 Delete User Data Trigger Function (Optional)
-- ============================================================================
-- Ensures complete data deletion when user account is deleted
-- provides additional assurance beyond cascade constraints
-- note: supabase may limit ability to trigger on auth.users table
-- if this fails, implement via edge functions or database webhooks instead

create or replace function delete_user_data()
returns trigger as $$
begin
  -- deletion order respects foreign key dependencies
  -- most deletions happen automatically via cascade, but this ensures completeness
  
  delete from public.tag_access where recipient_id = old.id;
  delete from public.public_links where note_id in
    (select id from public.notes where user_id = old.id);
  delete from public.llm_generations where user_id = old.id;
  delete from public.notes where user_id = old.id;
  delete from public.tags where user_id = old.id;
  
  return old;
end;
$$ language plpgsql
set search_path = '';

-- note: attempting to create trigger on auth.users may fail due to supabase permissions
-- if this migration fails at this step, it's expected - implement via edge functions instead
-- drop the trigger creation if it causes errors; cascade constraints will handle cleanup
-- begin
--   create trigger cleanup_user_data
--     before delete on auth.users
--     for each row
--     execute function delete_user_data();
-- exception when others then
--   raise notice 'Could not create trigger on auth.users (expected for supabase) - implement via edge functions';
-- end;
-- 
-- for now, we comment this out to avoid migration failures
-- supabase manages user deletion through their auth system

-- ============================================================================
-- 10. VERIFICATION
-- ============================================================================
-- Verify that all objects were created successfully

-- list created objects
-- select table_name from information_schema.tables where table_schema = 'public' order by table_name;
-- select routine_name from information_schema.routines where routine_schema = 'public' order by routine_name;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Schema is now ready for:
--   1. Application to connect via supabase client
--   2. Seed data for development/testing
--   3. RLS policy testing with different user scenarios
--   4. Performance benchmarking of indexed queries
