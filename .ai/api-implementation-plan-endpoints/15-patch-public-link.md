# API Endpoint Implementation Plan: PATCH /api/notes/{id}/public-link

## 1. Endpoint Overview

Endpoint updates note's public link. Permissions: owner only. Allows enabling/disabling link or changing expiration date.

MVP Note: Expiration date feature not implemented in MVP. Only is_enabled can be toggled.

## 2. Request Details

- **Method**: PATCH
- **URL**: `/api/notes/{id}/public-link`
- **Authentication**: Required (Bearer JWT)
- **Path parameters**: `id` (uuid) - Note ID

**Body (JSON, all optional)**:

- `is_enabled` (boolean, optional) - Enable/disable link

**Zod Schema**:

```typescript
export const patchPublicLinkSchema = z
  .object({
    is_enabled: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });
```

## 3. Types Used

- **DTO**: `PatchPublicLinkDTO`, `PublicLinkDTO`
- **Services**: `PublicLinksService.updatePublicLink(userId, noteId, patch)`

## 4. Response Details

**Success Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "token": "550e8400-e29b-41d4-a716-446655440099",
  "public_url": "https://app.10xnotes.com/public/550e8400-e29b-41d4-a716-446655440099",
  "is_enabled": false,
  "created_at": "2025-10-19T10:00:00Z"
}
```

**Error Responses**:

- `400 Bad Request`: No fields to update or invalid date
- `401 Unauthorized`: Missing token
- `403 Forbidden`: Not owner
- `404 Not Found`: Note or public link doesn't exist
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 5000 req/h
3. **Validation**: UUID `id` + body
4. **Check note ownership**: SELECT note WHERE id = $id AND user_id = $user_id
5. **Check link exists**: SELECT FROM public_links WHERE note_id = $id
6. **UPDATE**: UPDATE public_links SET <fields> WHERE note_id = $id
7. **Return**: 200 with updated DTO

## 6. Security Considerations

- **Owner only**: Check `user_id` for note
- **Token immutability**: Cannot change token (only via rotate)

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing token | 401 | "Authentication required" | Login |
|| Not owner | 403 | "Forbidden" | No action |
|| Note doesn't exist | 404 | "Note not found" | Check ID |
|| Public link doesn't exist | 404 | "Public link not found" | Create new via POST |
|| No fields | 400 | "No fields to update" | Add fields |
|| DB error | 500 | "Internal server error" | Retry |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- UPDATE O(1) on `public_links(note_id)` (foreign key index)

## 9. Implementation Steps

### Step 1: Zod Schema

- Create `src/lib/validators/public-links.schemas.ts`
- Define `patchPublicLinkSchema` with optional fields and refine validation

### Step 2: PublicLinksService

- Create `src/lib/services/public-links.service.ts`
- Method `updatePublicLink(userId: string, noteId: string, patch: PatchPublicLinkDTO): Promise<PublicLinkDTO>`:
  - Check note ownership
  - Check link exists
  - UPDATE public_links with provided fields
  - Return updated DTO

### Step 3: API Endpoint

- Create `src/pages/api/notes/[id]/public-link/index.ts`
- Add `export const prerender = false`
- Export PATCH handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (5000 req/h)
  - Validate UUID parameter and request body
  - Call `publicLinksService.updatePublicLink()`
  - Return 200 with updated link
  - Error handling (404 if link not found, 400 for no fields)
