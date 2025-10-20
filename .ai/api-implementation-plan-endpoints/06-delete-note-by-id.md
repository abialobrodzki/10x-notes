# API Endpoint Implementation Plan: DELETE /api/notes/{id}

## 1. Endpoint Overview

Endpoint deletes a note. Permissions: owner only. Operation should also delete/denormalize related records (e.g. public links) according to FK ON DELETE CASCADE.

## 2. Request Details

- Method: DELETE
- URL: `/api/notes/{id}`
- Authentication: Required (Bearer JWT)
- Path parameters: `id` (uuid)

## 3. Types Used

- Services: `NotesService.deleteNote(userId, noteId)`

## 4. Response Details

- 204 No Content — no body

Errors:

- 401 Unauthorized
- 403 Forbidden (not owner)
- 404 Not found
- 409 Conflict (when dependencies exist without CASCADE — not applicable if properly configured)
- 500 Internal server error

## 5. Data Flow

1. Authentication → user_id
2. Rate limit
3. Validate UUID `id`
4. SELECT note by id + owner check
5. DELETE FROM `notes` WHERE id = $1 AND user_id = $2
6. Return 204

## 6. Security Considerations

- Only owner can delete
- Don't reveal record existence to unauthorized users (return 404 on failed check)

## 7. Error Handling

- 404: no record (id doesn't exist or doesn't belong to user)
- 500: DB error

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- O(1) operation on index `notes_pkey`
- FK `public_links(note_id) on delete cascade` eliminates additional queries

## 9. Implementation Steps

### Step 1: NotesService

- Implement `src/lib/services/notes.service.ts`
- Method `deleteNote(userId: string, noteId: string): Promise<boolean>`:
  - Verify note exists and user is owner
  - DELETE FROM notes WHERE id = $noteId AND user_id = $userId
  - Return boolean indicating success

### Step 2: API Endpoint

- Create or update `src/pages/api/notes/[id].ts`
- Add `export const prerender = false`
- Export DELETE handler:
  - Call `requireAuth()` middleware
  - Rate limiting check
  - Validate UUID parameter
  - Call `notesService.deleteNote()`
  - Return 204 No Content on success
  - Return 404 if note not found or access denied
