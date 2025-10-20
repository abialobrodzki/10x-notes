# API Endpoint Implementation Plan: PATCH /api/notes/{id}

## 1. Endpoint Overview

Endpoint updates selected note fields. Permissions: owner only. Updated fields: `summary_text`, `original_content`, `goal_status`, `meeting_date`, `tag_id`.

## 2. Request Details

- Method: PATCH
- URL: `/api/notes/{id}`
- Authentication: Required (Bearer JWT)
- Path parameters: `id` (uuid)

Body (JSON, all optional):

- summary_text (string, 1..2000)
- original_content (string, 1..5000)
- goal_status (enum: 'achieved' | 'not_achieved' | 'undefined')
- meeting_date (YYYY-MM-DD)
- tag_id (uuid) — new tag must belong to user

Zod schema (shortened):

```ts
const patchNoteSchema = z
  .object({
    summary_text: z.string().min(1).max(2_000).optional(),
    original_content: z.string().min(1).max(5_000).optional(),
    goal_status: z.enum(["achieved", "not_achieved", "undefined"]).optional(),
    meeting_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    tag_id: z.string().uuid().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });
```

## 3. Types Used

- DTO: `PatchNoteDTO`, `NoteDTO`
- Services: `NotesService.updateNote(userId, noteId, patch)`

## 4. Response Details

- 200 OK — updated `NoteDTO`
- 204 No Content — alternative option (MVP chooses 200 with payload)

Errors:

- 400 Invalid payload (no fields to update)
- 401 Unauthorized
- 403 Forbidden (not owner or tag_id doesn't belong to user)
- 404 Not found (note doesn't exist for user)
- 409 Conflict (optionally for version control)
- 500 Internal server error

## 5. Data Flow

1. Authentication → user_id
2. Rate limit
3. Validate UUID `id` and body
4. SELECT note by id + owner check
5. If patch contains `tag_id` → check tag ownership
6. UPDATE `notes` (only passed fields) + `updated_at = now()`
7. Return updated record (JOIN tag)

## 6. Security Considerations

- Only owner can edit
- Validate field lengths
- No `user_id` substitution

## 7. Error Handling

- 400: no fields to update; invalid format
- 403: tag doesn't belong to user
- 404: note doesn't exist or doesn't belong to user
- 500: general server error

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- UPDATE on indexed field `id`
- Minimal payload (partial update)

## 9. Implementation Steps

### Step 1: Zod Schema

- Create `src/lib/validators/notes.schemas.ts`
- Define `patchNoteSchema` with optional fields and refine validation

### Step 2: NotesService

- Implement `src/lib/services/notes.service.ts`
- Method `updateNote(userId: string, noteId: string, patch: PatchNoteDTO): Promise<NoteDTO>`:
  - Query note to verify ownership
  - If `tag_id` in patch: verify tag ownership
  - UPDATE notes with provided fields
  - Set `updated_at = now()`
  - Fetch and return updated note with joined tag data

### Step 3: API Endpoint

- Create or update `src/pages/api/notes/[id].ts`
- Add `export const prerender = false`
- Export PATCH handler:
  - Call `requireAuth()` middleware
  - Rate limiting check
  - Validate UUID parameter and request body
  - Call `notesService.updateNote()`
  - Return 200 with updated note
  - Error handling (400 for no fields, 403 for tag ownership, 404 for not found)
