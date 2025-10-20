# API Endpoint Implementation Plan: POST /api/tags

## 1. Endpoint Overview

Endpoint creates a new tag for user. Tag must have a unique name within user's own tags. Automatically sets `user_id` to current user.

## 2. Request Details

- **Method**: POST
- **URL**: `/api/tags`
- **Authentication**: Required (Bearer JWT)
- **Rate limit**: 100 req/day per user

**Body (JSON)**:

- `name` (string, required, 1..100 chars) - Tag name (unique per user)

**Zod Schema**:

```typescript
export const createTagSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});
```

## 3. Types Used

- **DTO**: `CreateTagCommand`, `TagDTO`
- **DB**: table `tags` (id, user_id, name, created_at, updated_at)
- **Services**: `TagsService.createTag(userId, payload)`

## 4. Response Details

**Success Response (201 Created)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Project Alpha",
  "created_at": "2025-10-19T10:00:00Z",
  "updated_at": "2025-10-19T10:00:00Z"
}
```

**Error Responses**:

- `400 Bad Request`: Invalid payload (empty name, too long)
- `401 Unauthorized`: Missing or invalid JWT token
- `409 Conflict`: Tag with this name already exists for user
- `500 Internal Server Error`: Database error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 100 req/day check
3. **Body validation**: Parse through Zod (`name` trim + length)
4. **Check uniqueness**: SELECT tag WHERE user_id = $user_id AND LOWER(name) = LOWER($name)
5. **Insert**: INSERT INTO `tags` (user_id, name)
6. **Return response**: 201 with basic tag info (id, name, created_at, updated_at)

## 6. Security Considerations

- **RLS**: INSERT policy only for own `user_id`
- **Uniqueness**: Name must be unique within user's own tags (case-insensitive)
- **Trim whitespace**: Automatic trimming of spaces at start/end
- **Length limit**: Max 100 characters (DoS mitigation)
- **Rate limiting**: 100 req/day (spam prevention)

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing JWT token | 401 | "Authentication required" | Redirect to login |
|| Empty name | 400 | "Tag name is required" | Enter name |
|| Name too long | 400 | "Tag name must be at most 100 characters" | Shorten name |
|| Duplicate name | 409 | "Tag with this name already exists" | Use different name |
|| Rate limit exceeded | 429 | "Rate limit exceeded" | Wait until reset |
|| Database error | 500 | "Internal server error" | Retry |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance Considerations

**Expected response times**:

- P50: <20ms
- P95: <40ms

**Optimizations**:

- **Unique constraint**: Index on `tags(user_id, LOWER(name))` for fast duplicate check
- **Single transaction**: Insert in one transaction

**Bottlenecks**:

- None significant for MVP (simple indexed query)

## 9. Implementation Steps

### Step 1: Zod Schema

- Create `src/lib/validators/tags.schemas.ts`
- Define `createTagSchema` with name validation (trim, min 1, max 100)

### Step 2: TagsService

- Implement `src/lib/services/tags.service.ts`
- Method `createTag(userId: string, dto: CreateTagCommand): Promise<TagDTO>`:
  - Check uniqueness within user's own tags only (case-insensitive)
  - INSERT INTO tags (user_id, name)
  - Return basic DTO (id, name, created_at, updated_at)

### Step 3: API Endpoint

- Create `src/pages/api/tags/index.ts`
- Add `export const prerender = false`
- Export POST handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (100 req/day)
  - Validate request body through Zod
  - Call `tagsService.createTag()`
  - Return 201 with created tag
  - Error handling (409 for duplicate name)
