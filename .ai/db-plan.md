# Database Schema for 10xNotes MVP

## Overview

This document defines the complete PostgreSQL database schema for 10xNotes MVP - an AI-powered meeting notes application with smart summarization, tagging, and sharing capabilities. The schema is designed for Supabase with Row Level Security (RLS) enabled on all tables.

## Architecture Summary

- **6 main tables**: `tags`, `notes`, `tag_access`, `public_links`, `llm_generations`, plus `auth.users` (Supabase Auth)
- **1 enum type**: `goal_status_enum`
- **1 view**: `user_generation_stats`
- **Multi-layered security**: RLS policies for owner and recipient; public access via dedicated API endpoint
- **Optimized indexing**: B-tree indexes on foreign keys and filter columns
- **Referential integrity**: CASCADE and RESTRICT strategies based on business logic

---

## 1. Tables

### 1.1 auth.users (Supabase Auth - Reference Only)

Managed by Supabase Authentication. This table is not created by migrations but referenced by foreign keys.

**Referenced columns**:

- `id` (UUID, PRIMARY KEY) - User identifier

---

### 1.2 tags

Organizes notes into categories. Tags are unique per user (case-insensitive).

| Column       | Type        | Constraints                                           | Description           |
| ------------ | ----------- | ----------------------------------------------------- | --------------------- |
| `id`         | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()                | Unique tag identifier |
| `user_id`    | UUID        | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Tag owner             |
| `name`       | TEXT        | NOT NULL                                              | Tag name              |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now()                               | Creation timestamp    |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now()                               | Last update timestamp |

**Constraints**:

- `UNIQUE INDEX unique_tag_name_per_user ON tags(user_id, LOWER(name))` - Ensures case-insensitive uniqueness per user

**Relations**:

- 1:N with `notes` (one tag → many notes)
- 1:N with `tag_access` (one tag → many recipients)
- N:1 with `auth.users` (many tags → one user)

---

### 1.3 notes

Core table storing original meeting notes and AI-generated summaries.

| Column             | Type             | Constraints                                             | Description                             |
| ------------------ | ---------------- | ------------------------------------------------------- | --------------------------------------- |
| `id`               | UUID             | PRIMARY KEY, DEFAULT gen_random_uuid()                  | Unique note identifier                  |
| `user_id`          | UUID             | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE   | Note owner                              |
| `tag_id`           | UUID             | NOT NULL, REFERENCES tags(id) ON DELETE RESTRICT        | Assigned tag                            |
| `original_content` | TEXT             | NOT NULL, CHECK (char_length(original_content) <= 5000) | Original meeting notes (max 5000 chars) |
| `summary_text`     | TEXT             | NULLABLE, CHECK (char_length(summary_text) <= 2000)     | AI-generated summary (50-200 words)     |
| `goal_status`      | goal_status_enum | NULLABLE                                                | Meeting goal achievement status         |
| `suggested_tag`    | TEXT             | NULLABLE                                                | AI-suggested tag name                   |
| `meeting_date`     | DATE             | NOT NULL, DEFAULT CURRENT_DATE                          | Date of the meeting (user-editable)     |
| `is_ai_generated`  | BOOLEAN          | NOT NULL, DEFAULT TRUE                                  | Indicates if summary was AI-generated   |
| `created_at`       | TIMESTAMPTZ      | NOT NULL, DEFAULT now()                                 | Creation timestamp                      |
| `updated_at`       | TIMESTAMPTZ      | NOT NULL, DEFAULT now()                                 | Last update timestamp                   |

**Constraints**:

- `CHECK (char_length(original_content) <= 5000)` - Enforces content length limit
- `CHECK (char_length(summary_text) <= 2000)` - Enforces summary length limit (approx. 200 words buffer)

**Relations**:

- N:1 with `auth.users` (many notes → one user)
- N:1 with `tags` (many notes → one tag) - RESTRICT on delete
- 1:1 with `public_links` (optional)
- 1:N with `llm_generations` (one note → many AI calls)

---

### 1.4 tag_access

Junction table for N:M relationship between tags and recipients (users who can view notes with specific tags).

| Column         | Type        | Constraints                                           | Description                     |
| -------------- | ----------- | ----------------------------------------------------- | ------------------------------- |
| `id`           | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()                | Unique access record identifier |
| `tag_id`       | UUID        | NOT NULL, REFERENCES tags(id) ON DELETE CASCADE       | Tag being shared                |
| `recipient_id` | UUID        | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User receiving access           |
| `created_at`   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                               | When access was granted         |
| `updated_at`   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                               | Last update timestamp           |

**Constraints**:

- `UNIQUE (tag_id, recipient_id)` - Prevents duplicate access grants

**Relations**:

- N:M between `tags` and `auth.users` (recipients)

---

### 1.5 public_links

Public sharing links for individual notes (only summary is visible via public link).

| Column       | Type        | Constraints                                              | Description                                       |
| ------------ | ----------- | -------------------------------------------------------- | ------------------------------------------------- |
| `id`         | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()                   | Unique link identifier                            |
| `note_id`    | UUID        | NOT NULL, UNIQUE, REFERENCES notes(id) ON DELETE CASCADE | Note being shared                                 |
| `token`      | UUID        | NOT NULL, UNIQUE, DEFAULT gen_random_uuid()              | Public access token (URL format: /public/{token}) |
| `is_enabled` | BOOLEAN     | NOT NULL, DEFAULT TRUE                                   | Whether link is active                            |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now()                                  | Link creation timestamp                           |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now()                                  | Last update timestamp                             |

**Constraints**:

- `UNIQUE (note_id)` - One note can have at most one public link
- `UNIQUE (token)` - Each token must be globally unique

**Relations**:

- 1:1 with `notes`

---

### 1.6 llm_generations

Logging table for AI model invocations (monitoring, analytics, cost tracking).

| Column               | Type        | Constraints                                               | Description                                             |
| -------------------- | ----------- | --------------------------------------------------------- | ------------------------------------------------------- |
| `id`                 | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()                    | Unique generation log identifier                        |
| `note_id`            | UUID        | NULLABLE, REFERENCES notes(id) ON DELETE SET NULL         | Associated note (NULL if generation failed before save) |
| `user_id`            | UUID        | NULLABLE, REFERENCES auth.users(id) ON DELETE SET NULL    | User who triggered generation (NULL for anonymous)      |
| `model_name`         | TEXT        | NOT NULL                                                  | AI model used (e.g., "x-ai/grok-4-fast")                |
| `generation_time_ms` | INTEGER     | NOT NULL, CHECK (generation_time_ms >= 0)                 | Generation time in milliseconds (non-negative)          |
| `tokens_used`        | INTEGER     | NULLABLE, CHECK (tokens_used IS NULL OR tokens_used >= 0) | Total tokens consumed (non-negative if present)         |
| `status`             | TEXT        | NOT NULL, CHECK (status IN ('success', 'failure'))        | Generation status: 'success' or 'failure'               |
| `error_message`      | TEXT        | NULLABLE                                                  | Error details if status is 'failure'                    |
| `created_at`         | TIMESTAMPTZ | NOT NULL, DEFAULT now()                                   | Timestamp of generation                                 |

**Relations**:

- N:1 with `notes` (optional, SET NULL on delete)
- N:1 with `auth.users` (optional, SET NULL on delete)

---

## 2. Enums

### 2.1 goal_status_enum

Defines the status of meeting goals.

```sql
CREATE TYPE goal_status_enum AS ENUM (
  'achieved',      -- Goal was successfully achieved
  'not_achieved',  -- Goal was not achieved
  'undefined'      -- Cannot determine goal status from notes
);
```

---

## 3. Indexes

Performance-optimized B-tree indexes for common query patterns.

### 3.1 notes table

```sql
-- Indexes for notes table
-- Note: idx_notes_user_id removed - covered by composite idx_notes_user_meeting_date
-- Note: idx_notes_meeting_date removed - no global date queries in MVP scope

CREATE INDEX idx_notes_tag_id ON notes(tag_id);
CREATE INDEX idx_notes_goal_status ON notes(goal_status);
-- Composite index for optimal performance on user's notes list (query 11.1)
-- This index also covers queries filtering only by user_id
CREATE INDEX idx_notes_user_meeting_date ON notes(user_id, meeting_date DESC);
```

### 3.2 tags table

```sql
-- Indexes for tags table
-- Note: idx_tags_user_id removed - covered by composite unique_tag_name_per_user
CREATE UNIQUE INDEX unique_tag_name_per_user ON tags(user_id, LOWER(name));
```

### 3.3 tag_access table

```sql
-- Indexes for tag_access table
-- Note: idx_tag_access_recipient_id removed - covered by composite idx_tag_access_recipient_tag

CREATE INDEX idx_tag_access_tag_id ON tag_access(tag_id);
-- Composite index for optimal performance on shared notes queries (query 11.2)
-- This index also covers queries filtering only by recipient_id
CREATE INDEX idx_tag_access_recipient_tag ON tag_access(recipient_id, tag_id);
```

### 3.4 public_links table

```sql
-- Note: No explicit index needed for token column
-- The UNIQUE constraint on token already creates an index automatically
```

### 3.5 llm_generations table

```sql
CREATE INDEX idx_llm_generations_user_id ON llm_generations(user_id);
CREATE INDEX idx_llm_generations_note_id ON llm_generations(note_id);
```

---

## 4. Views

### 4.1 user_generation_stats

Aggregated statistics for AI generation usage per user.

```sql
CREATE VIEW user_generation_stats AS
SELECT
  user_id,
  COUNT(*) as total_generations,
  AVG(generation_time_ms) as avg_time_ms,
  SUM(COALESCE(tokens_used, 0)) as total_tokens,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_generations,
  SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failed_generations
FROM llm_generations
WHERE user_id IS NOT NULL
GROUP BY user_id;
```

---

## 5. Row Level Security (RLS) Policies

All tables have RLS enabled. Policies enforce data access control at the database level.

### 5.1 notes table

**Enable RLS**:

```sql
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
```

**Policy 1: Owner full access**

```sql
CREATE POLICY notes_owner_policy ON notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Policy 2: Shared tag access (read-only)**

```sql
CREATE POLICY notes_shared_tag_policy ON notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tag_access ta
      WHERE ta.tag_id = notes.tag_id
        AND ta.recipient_id = auth.uid()
    )
  );
```

**Note on Public Access**: Public link access is **NOT handled by RLS policies**. Instead, public notes must be accessed through a dedicated API endpoint (e.g., `/api/public/[token]`) that:

- Uses Supabase service role key to bypass RLS
- Validates the `token` from `public_links` table
- Returns **only** `summary_text`, `meeting_date`, and `goal_status` (never `original_content`)
- Checks `is_enabled = TRUE` before serving

This approach ensures unauthenticated users can view public summaries while preventing exposure of full note content to authenticated users through RLS.

---

### 5.2 tags table

**Enable RLS**:

```sql
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
```

**Policy 1: Owner full access**

```sql
CREATE POLICY tags_owner_policy ON tags
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Policy 2: Recipient read access**

```sql
CREATE POLICY tags_recipient_read_policy ON tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tag_access ta
      WHERE ta.tag_id = tags.id
        AND ta.recipient_id = auth.uid()
    )
  );
```

---

### 5.3 tag_access table

**Enable RLS**:

```sql
ALTER TABLE tag_access ENABLE ROW LEVEL SECURITY;
```

**Policy 1: Tag owner manages access**

```sql
CREATE POLICY tag_access_owner_policy ON tag_access
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tags t
      WHERE t.id = tag_access.tag_id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tags t
      WHERE t.id = tag_access.tag_id
        AND t.user_id = auth.uid()
    )
  );
```

**Policy 2: Recipients can view their own access**

```sql
CREATE POLICY tag_access_recipient_view_policy ON tag_access
  FOR SELECT
  USING (auth.uid() = recipient_id);
```

---

### 5.4 public_links table

**Enable RLS**:

```sql
ALTER TABLE public_links ENABLE ROW LEVEL SECURITY;
```

**Policy: Note owner full access**

```sql
CREATE POLICY public_links_owner_policy ON public_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = public_links.note_id
        AND n.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = public_links.note_id
        AND n.user_id = auth.uid()
    )
  );
```

---

### 5.5 llm_generations table

**Enable RLS**:

```sql
ALTER TABLE llm_generations ENABLE ROW LEVEL SECURITY;
```

**Policy: User can view only their own generation logs**

```sql
CREATE POLICY llm_generations_user_policy ON llm_generations
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Note on anonymous generations**: Anonymous generations (user_id IS NULL) are stored for admin analytics but are NOT accessible through RLS policies. This prevents authenticated users from viewing logs of anonymous users' generations, which would be a privacy leak. Admin access should use Supabase service role key to bypass RLS.

**Note**: INSERT operations should be performed by backend service using service role key.

---

## 6. Triggers

### 6.1 updated_at trigger

Automatically updates the `updated_at` column on every UPDATE operation.

**Function**:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Apply to all tables**:

```sql
CREATE TRIGGER set_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_tag_access_updated_at
  BEFORE UPDATE ON tag_access
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_public_links_updated_at
  BEFORE UPDATE ON public_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

### 6.2 delete_user_data trigger (optional)

Ensures complete data deletion when user account is deleted. While CASCADE constraints handle most cleanup, this trigger provides additional assurance and can be extended for custom cleanup logic.

**Function**:

```sql
CREATE OR REPLACE FUNCTION delete_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Deletion order respects foreign key dependencies
  -- Most deletions happen automatically via CASCADE, but this ensures completeness

  DELETE FROM tag_access WHERE recipient_id = OLD.id;
  DELETE FROM public_links WHERE note_id IN
    (SELECT id FROM notes WHERE user_id = OLD.id);
  DELETE FROM llm_generations WHERE user_id = OLD.id;
  DELETE FROM notes WHERE user_id = OLD.id;
  DELETE FROM tags WHERE user_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

**Apply to auth.users** (if Supabase allows custom triggers on auth schema):

```sql
CREATE TRIGGER cleanup_user_data
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION delete_user_data();
```

**Note**: Supabase may require this trigger to be implemented via Edge Functions or database webhooks depending on auth schema permissions.

---

## 7. Relationships Diagram

```
auth.users (Supabase Auth)
    |
    +-> tags (1:N, CASCADE)
    |     |
    |     +-> notes (1:N, RESTRICT)
    |     +-> tag_access (1:N, CASCADE)
    |
    +-> notes (1:N, CASCADE)
    |     |
    |     +-> public_links (1:1, CASCADE)
    |     +-> llm_generations (1:N, SET NULL)
    |
    +-> tag_access as recipient (1:N, CASCADE)
    +-> llm_generations (1:N, SET NULL)
```

**Cascade Strategy**:

- **CASCADE**: `auth.users` → `tags`, `notes`, `tag_access` (recipient)
- **CASCADE**: `tags` → `tag_access`
- **CASCADE**: `notes` → `public_links`
- **RESTRICT**: `tags` → `notes` (prevents accidental deletion of tags with notes)
- **SET NULL**: `notes` → `llm_generations`, `auth.users` → `llm_generations` (preserve logs)

---

## 8. SECURITY DEFINER Functions

For operations where RLS policies would create circular dependencies or performance issues, the schema uses PostgreSQL functions with `SECURITY DEFINER` privilege. These functions bypass RLS while maintaining security through explicit ownership checks.

### 8.1 get_tag_access_list(p_tag_id uuid)

Returns list of users with access to a tag (with emails from auth.users).

**Purpose**: Tag owners need to see recipients, but RLS prevents direct SELECT on tag_access (would create circular dependency with tags table).

**Security**: Verifies tag ownership via `auth.uid()` before returning data.

**Returns**: TABLE(recipient_id uuid, email text, granted_at timestamptz)

### 8.2 grant_tag_access(p_tag_id uuid, p_recipient_email text)

Grants tag access to a user by email.

**Purpose**: Resolves email to user_id from auth.users (requires elevated privileges) and prevents duplicate grants.

**Security**: Verifies tag ownership, validates email confirmation, prevents self-sharing.

**Returns**: TABLE(recipient_id uuid, email text, granted_at timestamptz)

### 8.3 revoke_tag_access(p_tag_id uuid, p_recipient_id uuid)

Revokes tag access from a user.

**Purpose**: Owners cannot SELECT tag_access records through RLS (recipient-only policy), but need to DELETE them.

**Security**: Verifies tag ownership before deletion.

**Returns**: jsonb with success status and deleted_count

### 8.4 get_tags_shared_counts(p_tag_ids uuid[])

Returns shared recipients count per tag.

**Purpose**: Owners need recipient counts for UI indicators, but RLS blocks SELECT on tag_access.

**Security**: Returns counts only for tags owned by current user.

**Returns**: TABLE(tag_id uuid, recipients_count bigint)

### 8.5 delete_user_account()

Deletes user account and all associated data.

**Purpose**: GDPR compliance - complete data removal on user request.

**Security**: Operates on current user only (auth.uid()).

**Returns**: boolean (success/failure)

**Implementation Note**: All SECURITY DEFINER functions explicitly set `search_path = ''` to prevent SQL injection attacks via search_path manipulation.

---

## 9. Design Decisions & Rationale

### 9.1 Data Integrity

- **Case-insensitive tag uniqueness**: Prevents confusion from duplicate tags with different casing
- **RESTRICT on tag deletion**: Requires user to reassign notes before deleting tag (prevents data loss)
- **CHECK constraint on content length**: Enforces 5000 character limit at database level
- **NOT NULL on critical fields**: Ensures data completeness for core entities
- **Non-negative numeric constraints**: `generation_time_ms >= 0` and `tokens_used >= 0` prevent invalid negative values in analytics
- **NULL vs 'undefined' for goal_status**: `goal_status` is NULLABLE without DEFAULT. NULL represents "no value yet" (before AI processing or on error), while 'undefined' represents AI's assessment that goal status cannot be determined from notes. This distinction aids debugging and provides clearer UX states. Applications can use COALESCE or views to default NULL to 'undefined' for display purposes if needed.
- **COALESCE for nullable aggregations**: In `user_generation_stats` view, `SUM(COALESCE(tokens_used, 0))` ensures `total_tokens` returns a number even when some generations have NULL tokens (e.g., models that don't report token usage). Without COALESCE, SQL's `SUM(NULL)` would return NULL for the entire aggregate.

### 9.2 Security

- **Multi-layered RLS policies**: Owner, recipient, and public access patterns
- **UUID tokens for public links**: More secure than auto-incrementing IDs
- **Separate access control table**: Clean separation of ownership vs. permissions
- **Service role for public access**: Unauthenticated users access public notes via API endpoint
- **SECURITY DEFINER functions**: Used where RLS would create circular dependencies, with explicit ownership validation

### 9.3 Performance

- **Strategic indexing**: Composite indexes cover single-column queries, eliminating redundant indexes
  - `notes(user_id, meeting_date DESC)` covers both combined and single `user_id` queries
  - `tag_access(recipient_id, tag_id)` covers both combined and single `recipient_id` queries
  - `tags(user_id, LOWER(name))` (UNIQUE) covers both tag name uniqueness and single `user_id` queries
  - Single indexes maintained only where composite cannot help (e.g., second column lookups)
- **View for statistics**: Pre-aggregated metrics without redundant columns
- **Separate logging table**: Keeps `notes` table lean, enables performance monitoring
- **No premature optimization**: No partitioning or full-text search on MVP (can be added later)
- **⚠️ Global date filtering**: After removing `idx_notes_meeting_date`, queries filtering globally by `meeting_date` without user context will perform full table scans. All MVP queries are scoped to user context, but this is important for post-MVP features. See section 11.6 for details.

### 9.4 Scalability

- **Separation of concerns**: Links, access, and logs in dedicated tables
- **UUID primary keys**: Better for distributed systems and sharding
- **Normalized structure**: 3NF normalized, ready for growth
- **Extensible design**: Easy to add features like versioning, full-text search, or archiving

### 9.5 User Experience

- **Soft deletable public links**: `is_enabled` flag allows disabling without deletion
- **Editable meeting dates**: Flexibility for users to correct date after creation
- **AI metadata tracking**: `is_ai_generated` flag for transparency

### 9.6 Compliance & Privacy

- **Minimal personal data**: Only email stored (via Supabase Auth)
- **Complete data deletion**: CASCADE + optional trigger ensures GDPR compliance
- **Audit trail**: `created_at` and `updated_at` on all entities

---

## 10. Future Enhancements (Post-MVP)

The schema is designed to accommodate these potential features without major restructuring:

1. **Version History**: Add `note_versions` table with foreign key to `notes`
2. **Full-Text Search**: Add GIN index on `summary_text` and `original_content`
3. **Partitioning**: Partition `notes` by `meeting_date` for long-term data management
4. **Soft Delete**: Add `deleted_at` columns for recoverable deletion
5. **Language Detection**: Add `language` column to `notes` for multilingual support
6. **Rate Limiting**: Add `user_quotas` table for usage limits
7. **Collaboration**: Extend `tag_access` with role-based permissions (read, write, admin)
8. **Attachments**: Add `note_attachments` table for files and images
9. **Templates**: Add `note_templates` table for reusable meeting note structures
10. **Analytics**: Add `user_activity` table for detailed usage tracking

---

## 11. Migration Checklist

When implementing this schema, follow this order:

**Pre-migration checks:**

```sql
-- Ensure UUID generation is available (built-in in PG 13+, explicit for clarity)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Remove deprecated public link policy if it exists (replaced by API endpoint approach)
DROP POLICY IF EXISTS notes_public_link_policy ON notes;

-- Remove deprecated indexes if they exist (replaced by composite indexes or removed as unused)
DROP INDEX IF EXISTS idx_public_links_token;      -- Covered by UNIQUE constraint on token
DROP INDEX IF EXISTS idx_notes_user_id;           -- Covered by composite idx_notes_user_meeting_date
DROP INDEX IF EXISTS idx_notes_meeting_date;      -- Not used in MVP scope (all queries scoped to user)
DROP INDEX IF EXISTS idx_tag_access_recipient_id; -- Covered by composite idx_tag_access_recipient_tag
DROP INDEX IF EXISTS idx_tags_user_id;            -- Covered by composite unique_tag_name_per_user
```

1. Create enum type: `goal_status_enum`
2. Create tables in dependency order:
   - `tags`
   - `notes`
   - `tag_access`
   - `public_links`
   - `llm_generations`
3. Create indexes
4. Create view: `user_generation_stats`
5. Create trigger function: `set_updated_at()`
6. Apply triggers to all tables
7. Create trigger function: `delete_user_data()` (optional)
8. Enable RLS on all tables
9. Create RLS policies for each table
10. Test RLS policies with different user scenarios
11. Create seed data for development/testing

---

## 12. Sample Queries

### 12.1 Get all notes for a user with tag names

```sql
SELECT n.*, t.name as tag_name
FROM notes n
JOIN tags t ON n.tag_id = t.id
WHERE n.user_id = auth.uid()
ORDER BY n.meeting_date DESC;
```

### 12.2 Get shared notes (notes from tags user has access to)

```sql
SELECT n.*, t.name as tag_name, t.user_id as owner_id
FROM notes n
JOIN tags t ON n.tag_id = t.id
JOIN tag_access ta ON ta.tag_id = t.id
WHERE ta.recipient_id = auth.uid()
ORDER BY n.meeting_date DESC;
```

### 12.3 Get user's AI usage statistics

```sql
SELECT * FROM user_generation_stats
WHERE user_id = auth.uid();
```

### 12.4 Get public note by token (server-side only)

```sql
SELECT n.summary_text, n.meeting_date, n.goal_status
FROM notes n
JOIN public_links pl ON pl.note_id = n.id
WHERE pl.token = $1 AND pl.is_enabled = TRUE;
```

### 12.5 Get all tags with note count

```sql
SELECT t.*, COUNT(n.id) as note_count
FROM tags t
LEFT JOIN notes n ON n.tag_id = t.id
WHERE t.user_id = auth.uid()
GROUP BY t.id
ORDER BY t.name;
```

### 12.6 Performance Note: Date Filtering

⚠️ **Important**: After removing `idx_notes_meeting_date`, queries filtering globally by `meeting_date` without user context are not optimized and will result in full table scans. Always scope date queries to user context:

```sql
-- ✅ OPTIMIZED (uses composite index idx_notes_user_meeting_date)
SELECT * FROM notes
WHERE user_id = auth.uid()
  AND meeting_date >= '2025-01-01'
ORDER BY meeting_date DESC;

-- ❌ NOT OPTIMIZED (no index, full table scan)
SELECT * FROM notes
WHERE meeting_date >= '2025-01-01'
ORDER BY meeting_date DESC;
```

If admin/analytics features requiring global date queries are needed post-MVP, consider adding a partial index:

```sql
-- Partial index for recent data only (admin queries)
CREATE INDEX idx_notes_meeting_date_recent ON notes(meeting_date DESC)
WHERE created_at > NOW() - INTERVAL '90 days';
```

This approach optimizes for:

- MVP queries scoped to users (using existing composite index)
- Future admin queries on recent data (using partial index)
- Minimal storage overhead and maintenance cost

---

## 13. Security Considerations

### 13.1 Environment Variables (Never in Database)

- OpenRouter API Key
- Supabase Service Role Key
- JWT Secrets

### 13.2 Rate Limiting

Implement application-level rate limiting for:

- AI generation requests (e.g., 100 per day per user)
- Public link access (e.g., 1000 views per link per day)
- API endpoints (e.g., 1000 requests per hour per IP)

### 13.3 Input Validation

- Sanitize user input before database insertion
- Validate email format at application level
- Enforce content length limits in both UI and database
- Validate date ranges for `meeting_date`

### 13.4 Access Control Testing

Test RLS policies for:

- Owners can CRUD their own data
- Recipients can only SELECT shared data
- Public links work only when `is_enabled = TRUE`
- Users cannot access other users' data
- Cascade deletes work correctly
- Anonymous users can access public links (via API)

---

## 14. Performance Benchmarks (Expected)

Based on MVP requirements and indexed queries:

| Operation           | Expected Performance | Notes                           |
| ------------------- | -------------------- | ------------------------------- |
| Get user notes      | < 50ms               | With index on `user_id`         |
| Create note with AI | < 2000ms             | Includes AI generation (1.5-2s) |
| Get shared notes    | < 100ms              | JOIN with indexed foreign keys  |
| Public link lookup  | < 20ms               | Direct index on `token`         |
| Tag search          | < 30ms               | Index on `LOWER(name)`          |
| User stats view     | < 50ms               | Aggregated view query           |

---

## Conclusion

This schema provides a solid foundation for 10xNotes MVP with:

- Complete feature coverage per PRD requirements
- Multi-layered security with RLS
- Optimized performance with strategic indexing
- GDPR-compliant data deletion
- Scalable architecture for future growth
- Clean separation of concerns
- Comprehensive monitoring and analytics

The design prioritizes **security**, **performance**, and **maintainability** while remaining flexible for post-MVP enhancements.
