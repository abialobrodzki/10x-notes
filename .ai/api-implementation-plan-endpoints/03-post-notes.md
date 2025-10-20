# API Endpoint Implementation Plan: POST /api/notes

## 1. Endpoint Overview

Creates a new user note with required tag assignment. Supports two flows:

1. **With AI**: client calls `/api/ai/generate` → receives summary + suggested_tag → creates note
2. **Without AI**: client creates note manually without summary (summary_text = null)

Endpoint handles XOR logic: exactly one of `tag_id` (existing tag) or `tag_name` (find or create tag) must be provided.

## 2. Request Details

- **Method**: POST
- **URL**: `/api/notes`
- **Authentication**: Required (Bearer JWT)
- **Rate Limiting**: 500/day per user

**Request Body (JSON)**:

```json
{
  "original_content": "...", // string, required, max 5000 chars
  "summary_text": null, // string | null, optional, nullable, max 2000 chars
  "goal_status": "achieved", // enum | null, optional, nullable
  "suggested_tag": "Project", // string | null, optional, nullable
  "meeting_date": "2025-10-19", // date, optional (default CURRENT_DATE)
  "tag_id": "uuid", // uuid, optional if tag_name provided (XOR)
  "tag_name": "Project Alpha", // string, optional if tag_id provided (XOR)
  "is_ai_generated": true // boolean, optional, auto-set to false when summary_text null
}
```

**Validation Notes**:

- **XOR Logic**: Exactly one of `tag_id` or `tag_name` must be provided.
  - If `tag_id` provided: Use existing tag by UUID (verify ownership).
  - If `tag_name` provided: Find existing tag (case-insensitive) OR create new tag in same transaction.
- `summary_text`: Can be omitted, set to null, or provided as string. If null on creation, `is_ai_generated` automatically = false.
- `goal_status`: Can be omitted, set to null, or set to enum values.
- `suggested_tag`: Can be omitted, set to null, or provided as string

**Zod Schema**:

```ts
import { z } from "zod";

export const createNoteSchema = z
  .object({
    original_content: z.string().min(1).max(5000),
    summary_text: z.string().max(2000).nullable().optional(),
    goal_status: z.enum(["achieved", "not_achieved", "undefined"]).nullable().optional(),
    suggested_tag: z.string().nullable().optional(),
    meeting_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    is_ai_generated: z.coerce.boolean().optional(),
  })
  .and(z.union([z.object({ tag_id: z.string().uuid() }), z.object({ tag_name: z.string().min(1) })]));

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
```

## 3. Types Used

- DTO: `CreateNoteDTO`, `NoteDTO`
- DB: table `notes` (id, user_id, tag_id, original_content, summary_text, is_ai_generated, goal_status, meeting_date, created_at, updated_at)
- Services: `NotesService.createNote(userId, payload)`

## 4. Response Details

- 201 Created

```json
{
  "id": "uuid",
  "summary_text": "...",
  "goal_status": "undefined",
  "meeting_date": "2025-10-19",
  "is_ai_generated": true,
  "created_at": "2025-10-19T10:00:00Z",
  "updated_at": "2025-10-19T10:00:00Z",
  "tag": { "id": "uuid", "name": "Projekt Alpha" },
  "is_owner": true,
  "has_public_link": false
}
```

Errors:

- 400 Invalid payload
- 401 Unauthorized
- 403 Tag not owned by user
- 409 Duplicate submission (optional based on idempotency key)
- 500 Internal server error

## 5. Data Flow

1. **Autentykacja** → user_id from JWT
2. **Rate limit check** (500/day per user)
3. **Walidacja body** (Zod schema)
4. **Tag Resolution (XOR logic)**:
   - **If `tag_id` provided**:
     - Verify tag exists AND user owns it: `SELECT id FROM tags WHERE id = $tag_id AND user_id = $user_id`
     - If not found → 403 Forbidden ("Tag not found or access denied")
   - **If `tag_name` provided**:
     a. Search for existing tag (case-insensitive): `SELECT id FROM tags WHERE user_id = $user_id AND LOWER(name) = LOWER($tag_name)`
     b. If found: use existing tag_id
     c. If not found: CREATE new tag in same transaction: `INSERT INTO tags (user_id, name) VALUES ($user_id, $tag_name)`
     d. Handle race condition: if INSERT fails with unique constraint → retry SELECT (another request created it simultaneously) → 409 Conflict
5. **Auto-set `is_ai_generated`**: If `summary_text` is null or omitted, set `is_ai_generated = false`
6. **Insert** into `notes` table with resolved tag_id
7. **Fetch complete note** with joined tag data + check for public link
8. **Return 201 Created** with complete NoteDTO

## 6. Security Considerations

- RLS on `notes` table
- Verify `tag_id` ownership before INSERT (protection against writing to someone else's tag)
- Sanity limits on field lengths (DoS mitigation)
- Never log full content to console

## 7. Error Handling

| Scenariusz | Status                          | Response Message | Akcja                                         |
| ---------- | ------------------------------- | ---------------- | --------------------------------------------- | -------------------------- |
|            | `original_content` > 5000 chars | 400              | "Content exceeds 5000 character limit"        | Shorten content            |
|            | Both `tag_id` and `tag_name`    | 400              | "Provide either tag_id or tag_name, not both" | Remove one field           |
|            | Neither `tag_id` nor `tag_name` | 400              | "Either tag_id or tag_name is required"       | Add one field              |
|            | Invalid Zod validation          | 400              | Validation details                            | Fix input data             |
|            | `tag_id` not found or not owned | 403              | "Tag not found or access denied"              | Use own tag                |
|            | Tag name race condition         | 409              | "Tag creation conflict, retry request"        | Retry (tag already exists) |
|            | Database error                  | 500              | "Internal server error"                       | Correlation ID in log      |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- Insert is O(1)
- Indexes on `notes(tag_id)`, `notes(user_id, meeting_date)`
- Size limit on `original_content`/`summary_text`

## 9. Implementation Steps

### Step 1: Zod Schema

- Create `src/lib/validators/notes.schemas.ts`
- Define `createNoteSchema` with XOR logic for tag_id/tag_name

### Step 2: NotesService

- Implement `src/lib/services/notes.service.ts`
- Method `createNote(userId: string, dto: CreateNoteInput): Promise<NoteDTO>`:
  - Tag resolution logic (find or create)
  - Handle race conditions for tag creation
  - Auto-set `is_ai_generated = false` when `summary_text` is null
  - Insert note with resolved tag_id
  - Fetch complete note with joined tag data

### Step 3: API Endpoint

- Create `src/pages/api/notes/index.ts`
- Add `export const prerender = false`
- Export POST handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (500/day per user)
  - Validate request body through Zod
  - Call `notesService.createNote()`
  - Return 201 with created note
  - Error handling (403 for tag ownership, 409 for conflicts)
