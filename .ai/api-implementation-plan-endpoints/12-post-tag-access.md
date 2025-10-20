# API Endpoint Implementation Plan: POST /api/tags/{id}/access

## 1. Endpoint Overview

Grants access to a tag to another user. Permissions: only tag owner. User identified by email (must exist in system).

## 2. Request Details

- **Method**: POST
- **URL**: `/api/tags/{id}/access`
- **Authentication**: Required (Bearer JWT)
- **Rate Limiting**: 50/hour per user
- **Path Parameters**: `id` (uuid) - Tag ID

**Body (JSON)**:

```json
{
  "recipient_email": "jan.kowalski@example.com" // string, required
}
```

**Zod Schema**:

```typescript
export const grantTagAccessSchema = z.object({
  recipient_email: z.string().email(),
});

export type GrantTagAccessInput = z.infer<typeof grantTagAccessSchema>;
```

## 3. Types Used

- **DTO**: `TagAccessGrantedDTO` (from types.ts)
- **DB**: table `tag_access` (tag_id, recipient_id, created_at) - **WITHOUT** access_type
- **Services**: `TagAccessService.grantAccess(ownerId, tagId, recipientEmail)`

## 4. Response Details

**Success Response (201 Created)**:

```json
{
  "recipient_id": "550e8400-e29b-41d4-a716-446655440001",
  "email": "jan.kowalski@example.com",
  "granted_at": "2025-10-19T10:00:00Z"
}
```

**Error Responses**:

- `400 Bad Request`: Invalid email
- `401 Unauthorized`: Missing token
- `403 Forbidden`: Not tag owner or trying to share with self
- `404 Not Found`: Tag doesn't exist or recipient doesn't exist
- `409 Conflict`: Recipient already has access to tag
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `owner_id`
2. **Rate Limiting**: 50 req/hour
3. **Validation**: UUID `id` + body (recipient_email)
4. **Check tag ownership**: `SELECT tag WHERE id = $id AND owner_id = $owner_id`
5. **Email to User ID Resolution** (requires service role):
   - `SELECT id FROM auth.users WHERE email = $recipient_email` (using supabaseAdmin)
   - If user not found → 404
   - If user email not confirmed → 400
6. **Prevent self-sharing**: If recipient_id == owner_id → 403
7. **Check duplicate**: `SELECT FROM tag_access WHERE tag_id = $id AND recipient_id = $recipient_id`
8. **Insert**: `INSERT INTO tag_access (tag_id, recipient_id) VALUES ($id, $recipient_id)`
9. **Return**: 201 with DTO (recipient_id, email, granted_at)

## 6. Security Considerations

- **Only owner**: Check `owner_id = user_id` (RLS enforcement)
- **Email validation**: Check if recipient exists in auth.users
- **Email confirmation check**: Recipient must have confirmed email address
- **No self-grant**: Owner cannot share with themselves (recipient_id != owner_id)
- **Service role usage**: Email lookup requires supabaseAdmin (bypasses RLS)

**Security Note**: This operation uses `supabaseAdmin` client (service role key) from `src/lib/services/supabase-admin.ts` to lookup user by email from auth.users. NEVER expose this client to frontend code.

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing token | 401 | "Authentication required" | Login |
|| Not owner | 403 | "Forbidden: Only tag owner can grant access" | No action |
|| Self-sharing attempt | 403 | "Cannot share tag with yourself" | Provide different email |
|| Tag doesn't exist | 404 | "Tag not found" | Check ID |
|| Recipient doesn't exist | 404 | "User with this email not found" | Check email |
|| Email not confirmed | 400 | "Recipient email not confirmed" | Recipient must confirm email |
|| Duplicate access | 409 | "Recipient already has access to this tag" | OK (already has access) |
|| Invalid email | 400 | "Invalid email format" | Fix format |
|| DB error | 500 | "Internal server error" | Retry |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- INSERT O(1)
- Lookup recipient by email (index on `auth.users(email)`) using supabaseAdmin
- Check duplicate (composite index on `tag_access(tag_id, recipient_id)`)

## 9. Implementation Note: Email to User ID Resolution

This endpoint requires resolving recipient email to user_id using Supabase Admin API (service role):

```typescript
const { data: users } = await supabaseAdmin.auth.admin.listUsers();
const recipient = users.users.find((u) => u.email?.toLowerCase() === recipientEmail.toLowerCase());

if (!recipient) {
  throw new Error("USER_NOT_FOUND");
}

if (!recipient.email_confirmed_at) {
  throw new Error("USER_EMAIL_NOT_CONFIRMED");
}

if (recipient.id === ownerId) {
  throw new Error("CANNOT_SHARE_WITH_SELF");
}
```

## 10. Implementation Steps

### Step 1: Zod Schema

- Create `src/lib/validators/tags.schemas.ts`
- Define `grantTagAccessSchema` with recipient_email validation

### Step 2: Supabase Admin Client

- Create `src/lib/services/supabase-admin.ts` if not exists
- Initialize service role client for auth.users access

### Step 3: TagAccessService

- Create `src/lib/services/tag-access.service.ts`
- Method `grantAccess(ownerId: string, tagId: string, recipientEmail: string): Promise<TagAccessGrantedDTO>`:
  - Check tag ownership (SELECT WHERE id = $tagId AND owner_id = $ownerId)
  - Lookup recipient by email using supabaseAdmin (auth.admin.listUsers)
  - Check email confirmation (email_confirmed_at)
  - Prevent self-sharing (recipient_id !== ownerId)
  - Check duplicate (SELECT FROM tag_access WHERE tag_id AND recipient_id)
  - INSERT INTO tag_access (tag_id, recipient_id)
  - Return DTO with recipient info

### Step 4: API Endpoint

- Create `src/pages/api/tags/[id]/access/index.ts`
- Add `export const prerender = false`
- Export POST handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (50 req/hour)
  - Validate UUID parameter and request body
  - Call `tagAccessService.grantAccess()`
  - Return 201 with granted access info
  - Error handling (403 for not owner/self-share, 404 for not found, 409 for duplicate)
