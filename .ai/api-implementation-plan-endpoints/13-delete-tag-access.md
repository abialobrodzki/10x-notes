# API Endpoint Implementation Plan: DELETE /api/tags/{id}/access/{userId}

## 1. Endpoint Overview

Endpoint removes user's access to a tag. Permissions: tag owner only.

## 2. Request Details

- **Method**: DELETE
- **URL**: `/api/tags/{id}/access/{userId}`
- **Authentication**: Required (Bearer JWT)
- **Path parameters**:
  - `id` (uuid) - Tag ID
  - `userId` (uuid) - User ID to remove

## 3. Types Used

- **Services**: `TagAccessService.revokeAccess(ownerId, tagId, userId)`

## 4. Response Details

**Success Response**:

- `204 No Content` — no body

**Error Responses**:

- `401 Unauthorized`: Missing token
- `403 Forbidden`: Not tag owner
- `404 Not Found`: Tag or access grant doesn't exist
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `owner_id`
2. **Rate Limiting**: 5000 req/h
3. **Validation**: UUID `id` + `userId`
4. **Check tag ownership**: SELECT tag WHERE id = $id AND owner_id = $owner_id
5. **DELETE**: DELETE FROM tag_access WHERE tag_id = $id AND user_id = $userId
6. **Check affected rows**: If 0 → 404
7. **Return**: 204

## 6. Security Considerations

- **Owner only**: Check `owner_id = user_id`
- **Don't reveal existence**: 404 when no access or access grant doesn't exist

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing token | 401 | "Authentication required" | Login |
|| Not owner | 403 | "Forbidden: Only tag owner can revoke access" | No action |
|| Tag doesn't exist | 404 | "Tag not found" | Check ID |
|| Access grant doesn't exist | 404 | "Access grant not found" | Check userId |
|| DB error | 500 | "Internal server error" | Retry |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- DELETE O(1) on composite index `tag_access(tag_id, user_id)`

## 9. Implementation Steps

### Step 1: UUID Validation Schema

- Use UUID schema for both `id` and `userId` parameters

### Step 2: TagAccessService

- Implement `src/lib/services/tag-access.service.ts`
- Method `revokeAccess(ownerId: string, tagId: string, userId: string): Promise<boolean>`:
  - Check tag ownership (SELECT WHERE id = $tagId AND owner_id = $ownerId)
  - DELETE FROM tag_access WHERE tag_id = $tagId AND user_id = $userId
  - Check affected rows (return false if 0)
  - Return boolean indicating success

### Step 3: API Endpoint

- Create `src/pages/api/tags/[id]/access/[userId].ts`
- Add `export const prerender = false`
- Export DELETE handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (5000 req/h)
  - Validate both UUID parameters
  - Call `tagAccessService.revokeAccess()`
  - Return 204 No Content on success
  - Return 404 if tag or access grant not found
  - Return 403 if not owner
