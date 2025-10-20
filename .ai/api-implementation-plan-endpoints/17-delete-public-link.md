# API Endpoint Implementation Plan: DELETE /api/notes/{id}/public-link

## 1. Endpoint Overview

Endpoint deletes note's public link. Permissions: owner only. Token becomes invalid.

## 2. Request Details

- **Method**: DELETE
- **URL**: `/api/notes/{id}/public-link`
- **Authentication**: Required (Bearer JWT)
- **Path parameters**: `id` (uuid) - Note ID

## 3. Types Used

- **Services**: `PublicLinksService.deletePublicLink(userId, noteId)`

## 4. Response Details

**Success Response**:

- `204 No Content` — no body

**Error Responses**:

- `401 Unauthorized`: Missing token
- `403 Forbidden`: Not owner
- `404 Not Found`: Note or public link doesn't exist
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 5000 req/h
3. **Validation**: UUID `id`
4. **Check note ownership**: SELECT note WHERE id = $id AND user_id = $user_id
5. **DELETE**: DELETE FROM public_links WHERE note_id = $id
6. **Check affected rows**: If 0 → 404
7. **Return**: 204

## 6. Security Considerations

- **Owner only**: Check `user_id` for note
- **Immediate invalidation**: Token immediately invalid after deletion

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing token | 401 | "Authentication required" | Login |
|| Not owner | 403 | "Forbidden" | No action |
|| Note doesn't exist | 404 | "Note not found" | Check ID |
|| Public link doesn't exist | 404 | "Public link not found" | Already deleted |
|| DB error | 500 | "Internal server error" | Retry |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- DELETE O(1) on `public_links(note_id)` (foreign key index)

## 9. Implementation Steps

### Step 1: PublicLinksService

- Create `src/lib/services/public-links.service.ts`
- Method `deletePublicLink(userId: string, noteId: string): Promise<boolean>`:
  - Check note ownership
  - DELETE FROM public_links WHERE note_id = $noteId
  - Check affected rows (return false if 0)
  - Return boolean indicating success

### Step 2: API Endpoint

- Create `src/pages/api/notes/[id]/public-link/index.ts`
- Add `export const prerender = false`
- Export DELETE handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (5000 req/h)
  - Validate UUID parameter
  - Call `publicLinksService.deletePublicLink()`
  - Return 204 No Content on success
  - Return 404 if link not found
