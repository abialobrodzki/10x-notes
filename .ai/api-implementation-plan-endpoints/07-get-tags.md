# API Endpoint Implementation Plan: GET /api/tags

## 1. Endpoint Overview

Endpoint returns user's tags: owned (owner) and those to which the user has access shared by others (via `tag_access`). Each tag contains metadata: note count.

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/tags`
- **Authentication**: Required (Bearer JWT)

**Query Parameters**:

- **Required**: None
- **Optional**:
  - `include_shared` (boolean) - Include shared tags (default: false)

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
      "updated_at": "2025-09-01T10:00:00Z",
      "is_owner": true,
      "note_count": 15,
      "shared_recipients": 2
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Team Beta",
      "created_at": "2025-08-15T12:00:00Z",
      "updated_at": "2025-08-16T14:30:00Z",
      "is_owner": false,
      "note_count": 8
    }
  ]
}
```

**Note**: Field `shared_recipients` contains the count of users who have access to the tag and is returned only when the current user is the owner (omitted for shared tags where user is not the owner).

**Response Headers**:

- `X-Total-Count`: Total number of tags returned (integer)

**Error Responses**:

- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: Database error

## 5. Data Flow

1. **Authentication**: Extract and validate JWT token → fetch `user_id`
2. **Rate Limiting**: Check limit of 10000 calls/hour per user
3. **Parameter validation**: Parse query params through Zod schema
4. **Build SQL query**:
   - Query for own tags (`user_id = current_user`)
   - If `include_shared=true`: UNION with tags from `tag_access` where `recipient_id = current_user`
   - LEFT JOIN with subquery counting notes per tag
   - LEFT JOIN with subquery counting shared recipients
5. **Execute query**: Fetch from database
6. **Transform to DTO**: Map raw data to `TagWithStatsDTO[]` with shared_recipients count (only include shared_recipients for owned tags, omit for shared tags)
7. **Set X-Total-Count header**: Set header with total number of tags
8. **Return response**: JSON with tags array

**Query optimization**:

- Unique index `unique_tag_name_per_user` on tags (user_id, lower(name))
- Index `idx_tag_access_recipient_tag` on tag_access(recipient_id, tag_id)
- Subquery for `note_count` instead of N+1 queries
- Subquery for `shared_recipients` count

## 6. Security Considerations

- **JWT Authentication**: Valid token required
- **RLS**: Policies restrict access to own tags and tags from `tag_access`
- **Parameter validation**: All parameters through Zod schema
- **Rate Limiting**: 10000 requests/hour per user
- **No sensitive data**: Don't return tag owner's email

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing JWT token | 401 | "Authentication required" | Redirect to login |
|| Invalid token | 401 | "Invalid or expired token" | Refresh token or relogin |
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
  - LEFT JOIN subquery for `shared_recipients` count (only for owned tags)
  - Transform to DTOs with updated_at field and shared_recipients (only when is_owner=true)

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
