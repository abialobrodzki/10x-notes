# API Endpoint Implementation Plan: GET /api/user/profile

## 1. Endpoint Overview

Endpoint returns logged-in user's profile. Contains basic user data from Supabase Auth.

## 2. Request Details

- **Method**: GET
- **URL**: `/api/user/profile`
- **Authentication**: Required (Bearer JWT)

## 3. Types Used

- **DTO**: `UserProfileDTO`
- **Services**: `UserService.getUserProfile(userId)`

## 4. Response Details

**Success Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "email": "jan.kowalski@example.com",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Error Responses**:

- `401 Unauthorized`: Missing token
- `404 Not Found`: User doesn't exist (unexpected - user is authenticated)
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 5000 req/h
3. **Fetch user data**: SELECT FROM auth.users WHERE id = $user_id
4. **Transform to DTO**: Map (public fields only)
5. **Return**: 200 with DTO

## 6. Security Considerations

- **Own profile only**: User can only see their own profile
- **Limited data**: Don't return hashed password, recovery tokens, etc.
- **Email exposure**: Email returned only for own profile

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing token | 401 | "Authentication required" | Login |
|| User doesn't exist | 404 | "User not found" | Edge case - shouldn't happen |
|| DB error | 500 | "Internal server error" | Retry |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

- SELECT O(1) on primary key `auth.users(id)`
- Minimal data transfer

## 9. Implementation Steps

### Step 1: UserService

- Create `src/lib/services/user.service.ts`
- Method `getUserProfile(userId: string): Promise<UserProfileDTO | null>`:
  - SELECT FROM auth.users WHERE id = $userId
  - Map to DTO with id, email, created_at

### Step 2: API Endpoint

- Create `src/pages/api/user/profile.ts`
- Add `export const prerender = false`
- Export GET handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (5000 req/h)
  - Call `userService.getUserProfile()`
  - Return 200 or 404 if not found
