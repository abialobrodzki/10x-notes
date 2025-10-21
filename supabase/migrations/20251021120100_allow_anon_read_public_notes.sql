-- migration: allow anonymous read of public notes via public_links
-- purpose: enable public access to notes shared via public links without bypassing rls
-- scope: public_links and notes tables - rls policies for anon select
--
-- tables affected:
--   - public_links (add anon select policy for enabled links)
--   - notes (add anon select policy for notes with active public links)
--
-- special considerations:
--   - only allows reading enabled public links (is_enabled = true)
--   - only allows reading notes that have active public links
--   - required for get /api/public/{token} endpoint
--   - returns limited data only (summary_text, meeting_date, goal_status, created_at)

-- enable rls if not already enabled (should already be enabled from initial migration)
alter table public_links enable row level security;
alter table notes enable row level security;

-- drop conflicting old anon policies (from initial schema)
drop policy if exists notes_anon_select on notes;
drop policy if exists notes_anon_insert on notes;
drop policy if exists notes_anon_update on notes;
drop policy if exists notes_anon_delete on notes;
drop policy if exists public_links_anon_select on public_links;
drop policy if exists public_links_anon_insert on public_links;
drop policy if exists public_links_anon_update on public_links;
drop policy if exists public_links_anon_delete on public_links;

-- policy 1: allow anonymous users to read enabled public links
create policy "allow_anon_read_enabled_public_links"
on public_links
for select
to anon  -- supabase anonymous role
using (is_enabled = true);

-- policy 2: allow anonymous users to read notes that have active public links
create policy "allow_anon_read_public_notes"
on notes
for select
to anon  -- supabase anonymous role
using (
  exists (
    select 1
    from public_links
    where public_links.note_id = notes.id
    and public_links.is_enabled = true
  )
);

-- comments for documentation
comment on policy "allow_anon_read_enabled_public_links" on public_links is
'allows anonymous users to read active public links. required for get /api/public/{token} endpoint.';

comment on policy "allow_anon_read_public_notes" on notes is
'allows anonymous users to read notes that have active public links. part of public sharing feature.';
