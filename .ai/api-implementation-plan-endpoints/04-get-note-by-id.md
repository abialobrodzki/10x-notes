# API Endpoint Implementation Plan: GET /api/notes/{id}

## 1. Endpoint Overview

Endpoint returns details of a single note, including full `original_content`. Access for owner and users with access to the tag to which the note is assigned.

## 2. Request Details

- Method: GET
- URL: `/api/notes/{id}`
- Authentication: Required (Bearer JWT)
- Path parameters: `id` (uuid)

## 3. Types Used

- DTO: `NoteDetailsDTO`
- DB: tables `notes`, `tags`, `tag_access` (view permissions)
- Services: `NotesService.getNoteById(userId, noteId)`

## 4. Response Details

- 200 OK

```json
{
  "id": "uuid",
  "original_content": "Full content...",
  "summary_text": "Summary...",
  "goal_status": "achieved",
  "meeting_date": "2025-10-19",
  "is_ai_generated": true,
  "created_at": "2025-10-19T10:00:00Z",
  "updated_at": "2025-10-19T10:00:00Z",
  "tag": { "id": "uuid", "name": "Project Alpha" },
  "is_owner": true,
  "has_public_link": false
}
```

Errors:

- 401 Unauthorized
- 404 Not found (also when access denied — don't reveal existence)
- 500 Internal server error

## 5. Data Flow

1. Authentication → user_id
2. Rate limit
3. Validate UUID `id`
4. SELECT note JOIN tag (or tag left join) + check ownership or shared access via `tag_access`
5. If no permissions → 404
6. Calculate `has_public_link` (LEFT JOIN `public_links` or separate query)
7. Return `NoteDetailsDTO`

## 6. Security Considerations

- RLS: enforces access only for owner, but for shared access we use view/policies tied to `tag_access`
- Don't return information whether note exists if access denied (404)
- Sanitize data in response

## 7. Error Handling

- 404: when not found or no access
- 500: DB error → standard message, log with correlation id

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- Index on `notes(id)`
- Join tags in single JOIN
- Public link check in batch at service level (reusable)

## 9. Implementation Steps

### Step 1: UUID Validation Schema

- Use `uuidSchema` from `src/lib/validators/common.schemas.ts`

### Step 2: NotesService

- Implement `src/lib/services/notes.service.ts`
- Method `getNoteById(userId: string, noteId: string): Promise<NoteDetailsDTO | null>`:
  - Query note with JOIN on tags
  - Check ownership OR shared access via tag_access
  - Calculate `has_public_link`
  - Return null if no access (for 404 response)

### Step 3: API Endpoint

- Create `src/pages/api/notes/[id].ts`
- Add `export const prerender = false`
- Export GET handler:
  - Call `requireAuth()` middleware
  - Rate limiting check
  - Validate UUID parameter
  - Call `notesService.getNoteById()`
  - Return 404 if note not found or no access
  - Return 200 with full note details
