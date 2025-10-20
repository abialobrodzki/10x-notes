# API Endpoint Implementation Plan: POST /api/notes/{id}/public-link

## 1. Endpoint Overview

Endpoint creates a public link to a note. Permissions: note owner only. Generates unique UUID token. Expiration dates not supported in MVP.

MVP Note: Expiration date feature not implemented in MVP. Links are permanent until manually disabled via is_enabled or deleted.

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

- **DTO**: `CreatePublicLinkDTO`, `PublicLinkDTO`
- **DB**: table `public_links` (id, note_id, token, is_enabled, expires_at, created_at)
- **Services**: `PublicLinksService.createPublicLink(userId, noteId, dto)`

## 4. Response Details

**Success Response (201 Created)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "token": "550e8400-e29b-41d4-a716-446655440099",
  "public_url": "https://app.10xnotes.com/public/550e8400-e29b-41d4-a716-446655440099",
  "is_enabled": true,
  "created_at": "2025-10-19T10:00:00Z"
}
```

**Error Responses**:

- `401 Unauthorized`: Missing token
- `403 Forbidden`: Not note owner
- `404 Not Found`: Note doesn't exist
- `409 Conflict`: Public link already exists for this note
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 1000 req/h
3. **Validation**: UUID `id` + body
4. **Check note ownership**: SELECT note WHERE id = $id AND user_id = $user_id
5. **Check duplicate**: SELECT FROM public_links WHERE note_id = $id
6. **Generate token**: UUID v4 using crypto.randomUUID()
7. **Insert**: INSERT INTO public_links (note_id, token)
8. **Return**: 201 with full URL

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
|| Link already exists | 409 | "Public link already exists for this note" | Use PATCH to update |
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
- Method `createPublicLink(userId: string, noteId: string, dto: CreatePublicLinkDTO): Promise<PublicLinkDTO>`:
  - Check note ownership (SELECT WHERE id = $noteId AND user_id = $userId)
  - Check duplicate (SELECT FROM public_links WHERE note_id = $noteId)
  - Generate secure token
  - INSERT INTO public_links (note_id, token)
  - Build full public URL
  - Return DTO

### Step 4: API Endpoint

- Create `src/pages/api/notes/[id]/public-link/index.ts`
- Add `export const prerender = false`
- Export POST handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (1000 req/h)
  - Validate UUID parameter and request body
  - Call `publicLinksService.createPublicLink()`
  - Return 201 with public link
  - Error handling (403 for not owner, 404 for not found, 409 for duplicate)
