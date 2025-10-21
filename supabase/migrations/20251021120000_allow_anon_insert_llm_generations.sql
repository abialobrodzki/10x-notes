-- migration: allow anonymous insert to llm_generations table
-- purpose: enable anonymous users to log ai generation metrics without bypassing rls
-- scope: llm_generations table - rls policy for anon insert
--
-- tables affected:
--   - llm_generations (add anon insert policy)
--
-- special considerations:
--   - allows all inserts from anon role (user_id can be null for anonymous)
--   - required for post /api/ai/generate endpoint
--   - logging is fire-and-forget, so failed inserts won't break the endpoint

-- enable rls if not already enabled (should already be enabled from initial migration)
alter table llm_generations enable row level security;

-- drop conflicting old anon policy (from initial schema)
drop policy if exists llm_generations_anon_insert on llm_generations;
drop policy if exists llm_generations_anon_select on llm_generations;
drop policy if exists llm_generations_anon_update on llm_generations;
drop policy if exists llm_generations_anon_delete on llm_generations;

-- create policy: allow anonymous users to insert their own generation logs
create policy "allow_anon_insert_llm_generations"
on llm_generations
for insert
to anon  -- supabase anonymous role
with check (true);  -- allow all inserts (user_id can be null for anonymous)

-- comment for documentation
comment on policy "allow_anon_insert_llm_generations" on llm_generations is
'allows anonymous users to log ai generation metrics. required for post /api/ai/generate endpoint.';
