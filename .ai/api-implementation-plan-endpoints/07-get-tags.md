# API Endpoint Implementation Plan: GET /api/tags

## 1. Endpoint Overview

Endpoint returns user's tags: owned (owner) and those to which the user has access shared by others (via `tag_access`). Each tag contains metadata: note count and access type information.

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/tags`
- **Authentication**: Required (Bearer JWT)

**Query Parameters**:

- **Required**: None
- **Optional**:
  - `include_shared` (boolean) - Include shared tags (default: false)
  - `sort_by` (enum) - Sort field ('name' | 'created_at' | 'note_count', default: 'name')
  - `order` (enum) - Sort direction ('asc' | 'desc', default: 'asc')

## 3. Types Used

**DTOs**:

- `TagsListDTO` - Main response object
- `TagWithStatsDTO` (from types.ts) - Single list item with metadata

**Command Models**:

- `TagsListQuery` - Query parameters (typed from Zod schema)

**Zod Schema**:

```typescript
export const tagsListQuerySchema = z.object({
  include_shared: z.coerce.boolean().default(false),
  sort_by: z.enum(["name", "created_at", "note_count"]).default("name"),
  order: sortOrderSchema,
});
```

## 4. Response Details

**Success Response (200)**:

```json
{
  "tags": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Project Alpha",
      "created_at": "2025-09-01T10:00:00Z",
      "is_owner": true,
      "note_count": 15,
      "access_type": "owner"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Team Beta",
      "created_at": "2025-08-15T12:00:00Z",
      "is_owner": false,
      "note_count": 8,
      "access_type": "read_only"
    }
  ]
}
```

**Note**: Field `access_type` is computed dynamically based on ownership: "owner" for tags where `owner_id = user_id`, "read_only" for tags accessed via `tag_access`.

**Response Headers**: None special

**Error Responses**:

- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: Database error

## 5. Data Flow

1. **Authentication**: Extract and validate JWT token → fetch `user_id`
2. **Rate Limiting**: Check limit of 5000 calls/hour per user
3. **Parameter validation**: Parse query params through Zod schema
4. **Build SQL query**:
   - Query for own tags (`owner_id = current_user`)
   - If `include_shared=true`: UNION with tags from `tag_access` where `recipient_id = current_user`
   - LEFT JOIN with subquery counting notes per tag
   - Apply sorting
5. **Execute query**: Fetch from database
6. **Transform to DTO**: Map raw data to `TagWithStatsDTO[]`, compute `access_type` field
7. **Return response**: JSON

**Query optimization**:

- Index on `tags(owner_id)`
- Index on `tag_access(user_id, tag_id)`
- Subquery for `note_count` instead of N+1 queries

## 6. Security Considerations

- **JWT Authentication**: Valid token required
- **RLS**: Policies restrict access to own tags and tags from `tag_access`
- **Parameter validation**: All parameters through Zod schema
- **Rate Limiting**: 5000 requests/hour per user
- **No sensitive data**: Don't return tag owner's email

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing JWT token | 401 | "Authentication required" | Redirect to login |
|| Invalid token | 401 | "Invalid or expired token" | Refresh token or relogin |
|| Invalid sort_by | 400 | "Invalid sort_by value" | Use correct enum value |
|| Rate limit exceeded | 429 | "Rate limit exceeded" | Wait until limit reset |
|| Database error | 500 | "Internal server error" | Retry, report error |

**Error handling flow**:

- Catch errors in try-catch
- Distinguish between authentication errors and database errors
- Log errors (with user_id context)
- Return standard error response

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance Considerations

**Expected response times**:

- P50: <30ms
- P95: <60ms
- Target: <100ms

**Optimizations**:

- **Composite query**: Single query with UNION instead of two separate
- **note_count subquery**: Efficient counting in one query
- **No pagination**: MVP returns all tags (assumption: <100 tags per user)
- **Connection pooling**: Reuse Supabase connections

**Bottlenecks**:

- Subquery for `note_count` may be slower for users with >1000 notes
- Large number of shared tags may slow down query

**Scaling**:

- For >100 tags: introduce pagination (post-MVP)
- Caching with TTL 5 min (tags change rarely)
- Denormalize `note_count` to `tags` table with triggers

## 9. Implementation Steps

### Step 1: Zod Schema and Types

- Create `src/lib/validators/tags.schemas.ts`
- Define `tagsListQuerySchema`
- Export `TagsListQuery` type

### Step 2: TagsService

- Implement `src/lib/services/tags.service.ts`
- Method `getTags(userId: string, query: TagsListQuery): Promise<TagsListDTO>`:
  - Query for own tags
  - UNION with shared tags (if `include_shared=true`)
  - LEFT JOIN subquery for `note_count`
  - Sorting
  - Transform to DTOs with computed `access_type` field:
    - "owner" when tag.owner_id = userId
    - "read_only" when tag accessed via tag_access

### Step 3: API Endpoint

- Create `src/pages/api/tags/index.ts`
- Add `export const prerender = false`
- Export GET handler:
  - Call `requireAuth()` middleware
  - Rate limiting check
  - Parse URL search params
  - Validate through Zod
  - Call `tagsService.getTags()`
  - Error handling
