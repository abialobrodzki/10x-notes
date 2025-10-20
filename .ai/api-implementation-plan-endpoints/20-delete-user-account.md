# API Endpoint Implementation Plan: DELETE /api/user/account

## 1. Endpoint Overview

Endpoint deletes user account. **Irreversible operation**. Cascades to delete all user data:

- All notes
- All tags
- All access permissions (`tag_access`)
- All public links

**WARNING**: This is a critical operation requiring special care!

## 2. Request Details

- **Method**: DELETE
- **URL**: `/api/user/account`
- **Authentication**: Required (Bearer JWT)

**Body (JSON)**:

- `confirmation_email` (string, required) - User's email for confirmation (must match account email)

**Zod Schema**:

```typescript
export const deleteAccountSchema = z.object({
  confirmation_email: z.string().email(),
});
```

## 3. Types Used

- **Command**: `DeleteAccountCommand` (from types.ts)
- **Services**: `UserService.deleteAccount(userId, confirmationEmail)`

## 4. Response Details

**Success Response**:

- `204 No Content` — no body

**Error Responses**:

- `400 Bad Request`: Invalid confirmation
- `401 Unauthorized`: Missing token
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 10 req/h (very low limit - sensitive operation)
3. **Validation**: Verify confirmation_email matches user's account email
4. **BEGIN TRANSACTION**
5. **Cascade deletion** (order respects FK constraints with ON DELETE RESTRICT on tags):
   - DELETE FROM notes WHERE user_id = $user_id (CASCADE deletes public_links automatically)
   - DELETE FROM tags WHERE user_id = $user_id (CASCADE deletes tag_access where user is owner)
   - DELETE FROM tag_access WHERE recipient_id = $user_id (remove entries where user is recipient)
   - DELETE FROM auth.users WHERE id = $user_id (Supabase Admin API)
6. **COMMIT TRANSACTION**
7. **Return**: 204

## 6. Security Considerations

- **Email confirmation required**: Confirmation email must match account email
- **Rate limiting**: 10 req/h (abuse prevention)
- **Audit log**: Log account deletion (important for compliance)
- **Transaction**: Everything in one transaction (atomicity)
- **No recovery**: No way to recover data after deletion

**GDPR Compliance**: Endpoint implements "right to be forgotten".

## 7. Error Handling

|     | Scenario             | Status Code | Message                             | Action                               |
| --- | -------------------- | ----------- | ----------------------------------- | ------------------------------------ |
|     | Missing token        | 401         | "Authentication required"           | Login                                |
|     | Invalid confirmation | 400         | "Email confirmation does not match" | Use correct account email            |
|     | Rate limit exceeded  | 429         | "Rate limit exceeded"               | Wait                                 |
|     | DB error             | 500         | "Internal server error"             | Retry (only if transaction rollback) |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- Operation may take several seconds for users with >1000 notes
- CASCADE deletes automatically managed by Postgres
- Timeout: 30s (higher than standard 10s)

## 9. Implementation Steps

### Step 1: Zod Schema

- Create `src/lib/validators/user.schemas.ts`
- Define `deleteAccountSchema` with email validation for confirmation_email

### Step 2: Supabase Admin Client Setup

- Create `src/db/supabase-admin.client.ts`
- Initialize service role client for auth admin operations

### Step 3: UserService

- Create `src/lib/services/user.service.ts`
- Method `deleteAccount(userId: string, confirmationEmail: string): Promise<boolean>`:
  - Fetch user's email from auth.users
  - Validate confirmationEmail matches user's account email
  - BEGIN TRANSACTION
  - DELETE FROM notes (respecting RESTRICT on tags: notes first, then tags)
  - DELETE FROM tags (CASCADE deletes tag_access where user is owner)
  - DELETE FROM tag_access WHERE recipient_id = $userId (entries where user is recipient)
  - Use supabase admin to delete from auth.users
  - COMMIT TRANSACTION
  - Return boolean

### Step 4: API Endpoint

- Create `src/pages/api/user/account.ts`
- Add `export const prerender = false`
- Export DELETE handler:
  - Very low rate limit (10 req/h)
  - Extended timeout (30s)
  - Call `userService.deleteAccount()`
  - Return 204 on success
