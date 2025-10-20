# API Endpoint Implementation Plan: PATCH /api/tags/{id}

## 1. Endpoint Overview

Endpoint updates tag name. Permissions: owner only. New name must be unique within user's tags.

## 2. Request Details

- **Method**: PATCH
- **URL**: `/api/tags/{id}`
- **Authentication**: Required (Bearer JWT)
- **Path parameters**: `id` (uuid)

**Body (JSON)**:

- `name` (string, required, 1..100 chars) - New tag name

**Zod Schema**:

```typescript
export const patchTagSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});
```

## 3. Types Used

- **DTO**: `UpdateTagCommand`, `TagDTO`
- **Services**: `TagsService.updateTag(userId, tagId, patch)`

## 4. Response Details

**Success Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "New Name",
  "created_at": "2025-09-01T10:00:00Z",
  "updated_at": "2025-10-19T14:30:00Z"
}
```

**Error Responses**:

- `400 Bad Request`: Invalid payload
- `401 Unauthorized`: Missing token
- `403 Forbidden`: Not owner (attempt to edit someone else's tag)
- `404 Not Found`: Tag doesn't exist
- `409 Conflict`: Duplicate name
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 5000 req/h
3. **Validation**: UUID `id` + body
4. **Check ownership**: SELECT tag WHERE id = $id AND user_id = $user_id
5. **Check new name uniqueness**: (skip if name hasn't changed)
6. **UPDATE**: UPDATE tags SET name = $name, updated_at = NOW() WHERE id = $id
7. **Fetch updated tag**: basic fields only (id, name, created_at, updated_at)
8. **Return**: 200 with basic tag info

## 6. Security Considerations

- **Owner only**: Check tag.user_id = current user_id
- **Uniqueness**: New name cannot collide with user's existing tags
- **Trim**: Automatic whitespace trimming
- **Length limit**: Max 100 characters

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing token | 401 | "Authentication required" | Login |
|| Not owner | 403 | "Forbidden: You are not the owner of this tag" | No action |
|| Tag doesn't exist | 404 | "Tag not found" | Check ID |
|| Duplicate name | 409 | "Tag with this name already exists" | Different name |
|| DB error | 500 | "Internal server error" | Retry |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- UPDATE on indexed `id` (primary key)
- Unique check may require query across shared tags

## 9. Implementation Steps

### Step 1: Zod Schema

- Create `src/lib/validators/tags.schemas.ts`
- Define `patchTagSchema` with name validation (trim, min 1, max 100)

### Step 2: TagsService

- Implement `src/lib/services/tags.service.ts`
- Method `updateTag(userId: string, tagId: string, dto: UpdateTagCommand): Promise<TagDTO>`:
  - Check ownership (SELECT WHERE id = $tagId AND user_id = $userId)
  - Check name uniqueness if name changed
  - UPDATE tags SET name = $name, updated_at = NOW() WHERE id = $tagId
  - Fetch updated tag (basic fields: id, name, created_at, updated_at)
  - Return basic DTO

### Step 3: API Endpoint

- Create `src/pages/api/tags/[id].ts`
- Add `export const prerender = false`
- Export PATCH handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (5000 req/h)
  - Validate UUID parameter and request body
  - Call `tagsService.updateTag()`
  - Return 200 with updated tag
  - Error handling (403 for not owner, 404 for not found, 409 for duplicate)
