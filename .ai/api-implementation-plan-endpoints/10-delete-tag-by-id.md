# API Endpoint Implementation Plan: DELETE /api/tags/{id}

## 1. Endpoint Overview

Endpoint deletes a tag. Permissions: owner only. **Tag cannot be deleted if it has assigned notes** (FK `notes(tag_id) ON DELETE RESTRICT`).

Operation cascades to related records:

- Access permissions (`tag_access`) for this tag

**WARNING**: Tag deletion is blocked if any notes are assigned to it. User must first reassign or delete notes manually.

## 2. Request Details

- **Method**: DELETE
- **URL**: `/api/tags/{id}`
- **Authentication**: Required (Bearer JWT)
- **Path parameters**: `id` (uuid)

## 3. Types Used

- **Services**: `TagsService.deleteTag(userId, tagId)`

## 4. Response Details

**Success Response**:

- `204 No Content` — no body

**Error Responses**:

- `401 Unauthorized`: Missing token
- `403 Forbidden`: Not owner
- `404 Not Found`: Tag doesn't exist
- `409 Conflict`: Cannot delete tag with existing notes
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 5000 req/h
3. **Validation**: UUID `id`
4. **Check ownership**: SELECT tag WHERE id = $id AND user_id = $user_id
5. **Check note count**: SELECT COUNT(\*) FROM notes WHERE tag_id = $id
6. **If note count > 0**: Return 409 Conflict with message
7. **DELETE**: DELETE FROM tags WHERE id = $id AND user_id = $user_id
8. **Cascade deletion**:
   - tag_access(tag_id) → CASCADE
9. **Return**: 204

## 6. Security Considerations

- **Owner only**: Check tag ownership (user_id matches)
- **Don't reveal existence**: Return 404 when no access (don't reveal if tag exists)
- **Confirm action**: Frontend should display warning before deletion (important!)

## 7. Error Handling

|     | Scenario          | Status Code | Message                                 | Action                             |
| --- | ----------------- | ----------- | --------------------------------------- | ---------------------------------- |
|     | Missing token     | 401         | "Authentication required"               | Login                              |
|     | Not owner         | 404         | "Tag not found"                         | No action (don't reveal existence) |
|     | Tag doesn't exist | 404         | "Tag not found"                         | Check ID                           |
|     | Tag has notes     | 409         | "Cannot delete tag with existing notes" | Reassign or delete notes first     |
|     | DB error          | 500         | "Internal server error"                 | Retry                              |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- DELETE O(1) on primary key
- COUNT query O(1) with index on notes(tag_id)
- CASCADE for tag_access automatically managed by Postgres
- RESTRICT prevents accidental deletion of tags with notes

## 9. Implementation Steps

### Step 1: TagsService

- Implement `src/lib/services/tags.service.ts`
- Method `deleteTag(userId: string, tagId: string): Promise<boolean>`:
  - Check ownership (SELECT WHERE id = $tagId AND user_id = $userId)
  - Check note count (SELECT COUNT(\*) FROM notes WHERE tag_id = $tagId)
  - If noteCount > 0: throw 409 Conflict error
  - DELETE FROM tags WHERE id = $tagId AND user_id = $userId
  - Cascade deletion for tag_access automatically handled by FK constraints
  - Return boolean indicating success

### Step 2: API Endpoint

- Create or update `src/pages/api/tags/[id].ts`
- Add `export const prerender = false`
- Export DELETE handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (5000 req/h)
  - Validate UUID parameter
  - Call `tagsService.deleteTag()`
  - Return 204 No Content on success
  - Return 404 if not found or not owner
