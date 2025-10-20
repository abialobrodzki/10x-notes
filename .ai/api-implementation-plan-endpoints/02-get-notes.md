# API Endpoint Implementation Plan: GET /api/notes

## 1. Endpoint Overview

Endpoint returns a paginated list of user's notes with filtering and sorting options. Handles own notes and optionally notes from tags shared by other users. The list does not include full `original_content` (available only in note details) to save bandwidth.

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/notes`
- **Authentication**: Required (Bearer JWT)

**Query Parameters**:

- **Required**: None
- **Optional**:
  - `tag_id` (UUID) - Filter by specific tag
  - `goal_status` (enum) - Filter by goal status ('achieved' | 'not_achieved' | 'undefined')
  - `date_from` (date) - Filter from date (YYYY-MM-DD)
  - `date_to` (date) - Filter to date (YYYY-MM-DD)
  - `page` (number) - Page number (default: 1)
  - `limit` (number) - Items per page (default: 20, max: 100)
  - `include_shared` (boolean) - Include notes from shared tags (default: false)
  - `sort_by` (enum) - Sort field ('meeting_date' | 'created_at' | 'updated_at', default: 'meeting_date')
  - `order` (enum) - Sort direction ('asc' | 'desc', default: 'desc')

## 3. Types Used

**DTOs**:

- `NotesListDTO` - Main response object with list and pagination
- `NoteListItemDTO` - Single list item (without `original_content`)
- `TagEmbeddedDTO` - Nested tag information
- `PaginationDTO` - Pagination metadata

**Command Models**:

- `NotesListQuery` - Query parameters (typed from Zod schema)

**Zod Schema**:

```typescript
export const notesListQuerySchema = z
  .object({
    tag_id: uuidSchema.optional(),
    goal_status: z.enum(["achieved", "not_achieved", "undefined"]).optional(),
    date_from: dateISOSchema.optional(),
    date_to: dateISOSchema.optional(),
    include_shared: z.coerce.boolean().default(false),
    sort_by: z.enum(["meeting_date", "created_at", "updated_at"]).default("meeting_date"),
    order: sortOrderSchema,
  })
  .merge(paginationQuerySchema);
```

## 4. Response Details

**Success Response (200)**:

```json
{
  "notes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "summary_text": "Meeting summary...",
      "goal_status": "achieved",
      "meeting_date": "2025-10-19",
      "is_ai_generated": true,
      "created_at": "2025-10-19T10:00:00Z",
      "updated_at": "2025-10-19T10:00:00Z",
      "tag": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Project Alpha"
      },
      "is_owner": true,
      "has_public_link": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

**Response Headers**:

- `X-Total-Count`: Total number of notes (ignores pagination)

**Error Responses**:

- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: Database error

## 5. Data Flow

1. **Authentication**: Extract and validate JWT token → fetch `user_id`
2. **Rate Limiting**: Check limit of 5000 calls/hour per user
3. **Parameter validation**: Parse query params through Zod schema
4. **Build SQL query**:
   - Query for own notes (`user_id = current_user`)
   - If `include_shared=true`: additional query for notes from shared tags (UNION)
   - Apply filters (tag_id, goal_status, date range)
   - Apply sorting with secondary sort (id DESC for stable pagination)
5. **Execute query**: Fetch from DB using indexes (`idx_notes_user_meeting_date`)
6. **Count total**: Separate count query for pagination metadata
7. **Fetch public links**: Check which notes have public links
8. **Transform to DTO**: Map raw data to `NoteListItemDTO[]`
9. **Return response**: JSON with `X-Total-Count` header

**Query optimization**:

- Uses composite index `idx_notes_user_meeting_date` for sorting
- UNION ALL instead of UNION (no deduplication needed)
- Eager loading tags via JOIN (no N+1 problem)

## 6. Security Considerations

- **JWT Authentication**: Valid token required in `Authorization: Bearer <token>` header
- **RLS (Row Level Security)**: RLS policies automatically restrict access to own notes and notes from shared tags
- **UUID validation**: Verify `tag_id` format before using in query
- **Sanitized query params**: All parameters through Zod schema (injection protection)
- **Rate Limiting**: 5000 requests/hour per user (abuse prevention)
- **No `original_content`**: List doesn't return full content (only in `/notes/{id}`)

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing JWT token | 401 | "Authentication required" | Redirect to login |
|| Invalid token | 401 | "Invalid or expired token" | Refresh token or relogin |
|| Invalid UUID in tag_id | 400 | "Invalid UUID format" | Fix format |
|| Invalid date format | 400 | "Date must be in YYYY-MM-DD format" | Use correct format |
|| Limit > 100 | 400 | Automatic correction to 100 (by Zod) | Limit will be capped |
|| Rate limit exceeded | 429 | "Rate limit exceeded" | Wait until limit reset |
|| Database error | 500 | "Internal server error" | Retry, report error |

**Error handling flow**:

- Catch errors in try-catch
- Distinguish between authentication errors and database errors
- Log errors to console (with user_id context)
- Return standard error response

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance Considerations

**Expected response times**:

- P50: <50ms
- P95: <100ms
- Target: <200ms even for large datasets

**Optimizations**:

- **Composite index**: `idx_notes_user_meeting_date` for fast sorting by user + date
- **Pagination**: Max limit 100 items per page
- **Eager loading**: JOIN tags in single query (no N+1)
- **Count cache (future)**: Possibility to cache total count
- **Connection pooling**: Reuse Supabase connections

**Bottlenecks**:

- Queries with `include_shared=true` are slower (requires UNION)
- Large number of shared tags may slow down query
- Fetch public links (additional query) - can optimize via batch loading

**Scaling**:

- For >1000 notes per user: cursor-based pagination (post-MVP)
- For high-traffic: read replicas in Supabase
- Cache lists with short TTL (e.g. 1 minute)

## 9. Implementation Steps

### Step 1: Zod Schema and Types

- Create `src/lib/validators/notes.schemas.ts`
- Define `notesListQuerySchema` with validation for all parameters
- Export `NotesListQuery` type

### Step 2: NotesService

- Implement `src/lib/services/notes.service.ts`
- Method `getNotes(userId: string, query: NotesListQuery): Promise<NotesListDTO>`:
  - Query builder for own notes
  - Conditional query for shared notes (if `include_shared=true`)
  - Apply filters (tag_id, goal_status, date range)
  - Sorting with secondary sort by id
  - Pagination (offset, limit)
  - Fetch public links in batch
  - Transform to DTOs

### Step 3: API Endpoint

- Create `src/pages/api/notes/index.ts`
- Add `export const prerender = false`
- Export GET handler:
  - Call `requireAuth()` middleware
  - Rate limiting check
  - Parse URL search params
  - Validate through Zod
  - Call `notesService.getNotes()`
  - Add `X-Total-Count` header
  - Error handling

### Step 4: Pagination Utilities

- Implement `src/lib/utils/pagination.utils.ts`:
  - Function `parsePagination()` - validate page/limit
  - Function `createPaginationDTO()` - build metadata
