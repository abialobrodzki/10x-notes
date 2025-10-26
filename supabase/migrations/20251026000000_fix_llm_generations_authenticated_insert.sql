-- migration: fix llm_generations INSERT policy for authenticated users
-- purpose: allow authenticated users to log their own ai generation metrics
-- scope: llm_generations table - add authenticated insert policy
--
-- problem:
--   authenticated users cannot insert to llm_generations due to missing rls policy
--   error: "new row violates row-level security policy for table llm_generations"
--
-- solution:
--   create policy allowing authenticated users to insert their own generation logs
--
-- tables affected:
--   - llm_generations (add authenticated insert policy)
--
-- special considerations:
--   - only allows inserts where user_id matches authenticated user's id
--   - required for telemetry logging in openrouter service
--   - complements existing anon insert policy

-- create policy: allow authenticated users to insert their own generation logs
create policy "allow_authenticated_insert_llm_generations"
on llm_generations
for insert
to authenticated
with check (auth.uid() = user_id);

-- comment for documentation
comment on policy "allow_authenticated_insert_llm_generations" on llm_generations is
'allows authenticated users to log their own ai generation metrics. user_id must match auth.uid().';
