# API Endpoint Implementation Plan: POST /api/notes/{id}/public-link/rotate

## 1. Endpoint Overview

Endpoint rotates (changes) public link token. Permissions: owner only. Old token becomes invalid, new one is generated.

## 2. Request Details

- **Method**: POST
- **URL**: `/api/notes/{id}/public-link/rotate`
- **Authentication**: Required (Bearer JWT)
- **Path parameters**: `id` (uuid) - Note ID
- **Body**: None

## 3. Types Used

- **Services**: `PublicLinksService.rotateToken(userId, noteId)`

## 4. Response Details

**Success Response (200 OK)**:

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440199",
  "url": "/public/550e8400-e29b-41d4-a716-446655440199",
  "is_enabled": true,
  "updated_at": "2025-10-19T15:30:00Z"
}
```

**Error Responses**:

- `401 Unauthorized`: Missing token
- `403 Forbidden`: Not owner
- `404 Not Found`: Note or public link doesn't exist
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 100 req/h (lower limit - sensitive operation)
3. **Validation**: UUID `id`
4. **Check note ownership**: SELECT note WHERE id = $id AND user_id = $user_id
5. **Check link exists**: SELECT FROM public_links WHERE note_id = $id
6. **Generate new token**: UUID v4 using crypto.randomUUID()
7. **UPDATE**: UPDATE public_links SET token = $new_token, updated_at = NOW() WHERE note_id = $id
8. **Return**: 200 with new DTO without id field, with relative URL (/public/{token}), including updated_at timestamp

## 6. Security Considerations

- **Owner only**: Check `user_id` for note
- **Crypto-secure token**: New token generated as UUID v4 via crypto.randomUUID()
- **Immediate invalidation**: Old token immediately invalid
- **Rate limiting**: 100 req/h (abuse prevention)
- **Audit log**: Log token rotation (optional)

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing token | 401 | "Authentication required" | Login |
|| Not owner | 403 | "Forbidden" | No action |
|| Note doesn't exist | 404 | "Note not found" | Check ID |
|| Public link doesn't exist | 404 | "Public link not found" | Create new via POST |
|| Rate limit exceeded | 429 | "Rate limit exceeded" | Wait |
|| DB error | 500 | "Internal server error" | Retry |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- UPDATE O(1) on `public_links(note_id)`
- Token generation: O(1)

## 9. Implementation Steps

### Step 1: Token Utility

- Ensure `src/lib/utils/token.utils.ts` provides `generatePublicLinkToken()` returning UUID v4

### Step 2: PublicLinksService

- Create `src/lib/services/public-links.service.ts`
- Method `rotateToken(userId: string, noteId: string): Promise<PublicLinkDTO>`:
  - Check note ownership
  - Check link exists
  - Generate new secure token
  - UPDATE public_links SET token = $newToken, updated_at = NOW() WHERE note_id = $noteId
  - Return updated DTO without id field, with new token, relative URL (/public/{token}), and updated_at timestamp

### Step 3: API Endpoint

- Create `src/pages/api/notes/[id]/public-link/rotate.ts`
- Add `export const prerender = false`
- Export POST handler:
  - Lower rate limit (100 req/h)
  - Validate UUID parameter
  - Call `publicLinksService.rotateToken()`
  - Return 200 with updated link
