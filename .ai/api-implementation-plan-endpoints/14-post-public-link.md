# API Endpoint Implementation Plan: POST /api/notes/{id}/public-link

## 1. Endpoint Overview

Endpoint creates a public link to a note. Permissions: note owner only. Generates unique UUID v4 token.

**Idempotency**: If link already exists, returns existing link with 200 OK and is_new: false. If creating new link, returns 201 Created with is_new: true.

## 2. Request Details

- **Method**: POST
- **URL**: `/api/notes/{id}/public-link`
- **Authentication**: Required (Bearer JWT)
- **Path parameters**: `id` (uuid) - Note ID

**Body (JSON)**:
(no fields - empty body or omit)

**Zod Schema**:

```typescript
export const createPublicLinkSchema = z.object({});
// MVP: No fields required. Expiration feature post-MVP.
```

## 3. Types Used

- **DTO**: `PublicLinkDTO` (no input command - empty body)
- **DB**: table `public_links` (id, note_id, token, is_enabled, created_at)
- **Services**: `PublicLinksService.createPublicLink(userId, noteId)`

## 4. Response Details

**Success Response (201 Created)** - New link created:

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440099",
  "url": "/public/550e8400-e29b-41d4-a716-446655440099",
  "is_enabled": true,
  "is_new": true,
  "created_at": "2025-10-19T10:00:00Z"
}
```

**Success Response (200 OK)** - Link already exists (idempotent):

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440099",
  "url": "/public/550e8400-e29b-41d4-a716-446655440099",
  "is_enabled": true,
  "is_new": false,
  "created_at": "2025-10-19T10:00:00Z"
}
```

**Error Responses**:

- `401 Unauthorized`: Missing token
- `403 Forbidden`: Not note owner
- `404 Not Found`: Note doesn't exist
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 1000 req/h
3. **Validation**: UUID `id` + body
4. **Check note ownership**: SELECT note WHERE id = $id AND user_id = $user_id
5. **Check if link exists**: SELECT FROM public_links WHERE note_id = $id
6. **If exists**: Return 200 OK with existing link and is_new: false (idempotent behavior)
7. **If not exists**: Generate UUID v4 token using crypto.randomUUID()
8. **Insert**: INSERT INTO public_links (note_id, token, is_enabled=true)
9. **Return**: 201 Created with relative URL (/public/{token}) and is_new: true

## 6. Security Considerations

- **Owner only**: Check `user_id` for note
- **Crypto-secure token**: Use crypto.randomUUID() for UUID v4 generation
- **Token uniqueness**: Unique constraint on `public_links(token)`
- **Rate limiting**: 1000 req/h (spam prevention)

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing token | 401 | "Authentication required" | Login |
|| Not owner | 403 | "Forbidden: You are not the owner of this note" | No action |
|| Note doesn't exist | 404 | "Note not found" | Check ID |
|| DB error | 500 | "Internal server error" | Retry |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- INSERT O(1)
- Token generation: O(1)
- Check note ownership: index on `notes(id, user_id)`

## 9. Implementation Steps

### Step 1: Zod Schema

- Create `src/lib/validators/public-links.schemas.ts`
- Define `createPublicLinkSchema` (empty object for MVP)

### Step 2: Token Generator Utility

- Create `src/lib/utils/token.utils.ts`
- Implement `generatePublicLinkToken(): string`:
  - Use crypto.randomUUID() for UUID v4 generation
  - Return UUID string

### Step 3: PublicLinksService

- Create `src/lib/services/public-links.service.ts`
- Method `createPublicLink(userId: string, noteId: string): Promise<{link: PublicLinkDTO, is_new: boolean}>`:
  - Check note ownership (SELECT WHERE id = $noteId AND user_id = $userId)
  - Check if link exists (SELECT FROM public_links WHERE note_id = $noteId)
  - If exists: Return existing link with is_new: false
  - If not exists: Generate secure UUID v4 token, INSERT INTO public_links (note_id, token, is_enabled=true)
  - Build relative public URL (/public/{token})
  - Return DTO without id field, with is_new flag

### Step 4: API Endpoint

- Create `src/pages/api/notes/[id]/public-link/index.ts`
- Add `export const prerender = false`
- Export POST handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (1000 req/h)
  - Validate UUID parameter and request body
  - Call `publicLinksService.createPublicLink()`
  - Return 201 Created with is_new: true if new link created
  - Return 200 OK with is_new: false if link already exists (idempotent)
  - Error handling (403 for not owner, 404 for not found)
