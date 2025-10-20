# API Endpoint Implementation Plan: GET /api/tags/{id}/access

## 1. Endpoint Overview

Endpoint returns list of users with access to a tag. Permissions: only tag owner can view access list.

## 2. Request Details

- **Method**: GET
- **URL**: `/api/tags/{id}/access`
- **Authentication**: Required (Bearer JWT)
- **Path parameters**: `id` (uuid) - Tag ID

## 3. Types Used

**DTOs**:

- `TagAccessListDTO` - Main response object
- `TagAccessItemDTO` - Single permission

**Zod Schema**:

```typescript
// UUID validation for tag_id
export const tagIdParamSchema = z.object({
  id: z.string().uuid(),
});
```

## 4. Response Details

**Success Response (200)**:

```json
{
  "recipients": [
    {
      "recipient_id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "jan.kowalski@example.com",
      "granted_at": "2025-10-01T10:00:00Z"
    },
    {
      "recipient_id": "550e8400-e29b-41d4-a716-446655440002",
      "email": "anna.nowak@example.com",
      "granted_at": "2025-09-15T14:30:00Z"
    }
  ]
}
```

**Error Responses**:

- `401 Unauthorized`: Missing token
- `403 Forbidden`: Not tag owner
- `404 Not Found`: Tag doesn't exist
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 5000 req/h
3. **Validation**: UUID `id`
4. **Check ownership**: SELECT tag WHERE id = $id AND user_id = $user_id
5. **Fetch recipients list**: SELECT from `tag_access` JOIN `auth.users` WHERE tag_id = $id
6. **Transform to DTO**: Map to recipients array with {recipient_id, email, granted_at}
7. **Return**: 200 with recipients list

## 6. Security Considerations

- **Owner only**: Check tags.user_id = current user_id
- **Email exposure**: Return email only to users with access (owner)
- **No sensitive data**: Don't return passwords or tokens

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing token | 401 | "Authentication required" | Login |
|| Not owner | 403 | "Forbidden: Only tag owner can view access list" | No action |
|| Tag doesn't exist | 404 | "Tag not found" | Check ID |
|| DB error | 500 | "Internal server error" | Retry |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- Query with JOIN on indexed fields
- Index on `tag_access(tag_id)`
- MVP: no pagination (assumption <100 users per tag)

## 9. Implementation Steps

### Step 1: Zod Schema

- Create `src/lib/validators/tags.schemas.ts`
- Define `tagIdParamSchema` for UUID validation

### Step 2: TagAccessService

- Create `src/lib/services/tag-access.service.ts`
- Method `getTagAccess(userId: string, tagId: string): Promise<TagAccessListDTO>`:
  - Check ownership (SELECT WHERE id = $tagId AND user_id = $userId)
  - Fetch recipients: SELECT from tag_access JOIN auth.users WHERE tag_id = $tagId
  - Transform to DTO with recipients array: {recipient_id, email, granted_at}
  - Return recipients list

### Step 3: API Endpoint

- Create `src/pages/api/tags/[id]/access/index.ts`
- Add `export const prerender = false`
- Export GET handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (5000 req/h)
  - Validate UUID parameter
  - Call `tagAccessService.getTagAccess()`
  - Return 200 with access list
  - Error handling (403 for not owner, 404 for not found)
