# REST API Plan - 10xNotes MVP

## 1. Resources

| Resource           | Database Table  | Description                                               |
| ------------------ | --------------- | --------------------------------------------------------- |
| **AI Generations** | llm_generations | AI-powered summary generation (anonymous & authenticated) |
| **Notes**          | notes           | Meeting notes with original content and AI summaries      |
| **Tags**           | tags            | Note organization categories with unique names per user   |
| **Tag Access**     | tag_access      | Permission management for sharing tag collections         |
| **Public Links**   | public_links    | Anonymous access to note summaries via unique tokens      |
| **Users**          | auth.users      | User accounts managed by Supabase Auth                    |

## 2. Endpoints

### HTTP Method Semantics

- GET: Retrieve resource(s)
- POST: Create new resource
- PATCH: Partial update of resource (only specified fields modified)
- DELETE: Remove resource
- PUT: Not used in MVP (would imply full resource replacement)

### 2.1 AI Generation

#### POST /api/ai/generate

Generate AI summary from meeting notes content (no authentication required).

**Parameters:**

- None

**Request Body:**

```json
{
  "original_content": "Raw meeting notes...", // string, required, max 5000 chars
  "model_name": "x-ai/grok-4-fast" // string, optional, default: 'x-ai/grok-4-fast'
}
```

**Success Response (200):**

```json
{
  "summary_text": "Meeting summary...",
  "goal_status": "achieved", // enum: "achieved" | "not_achieved" | "undefined"
  "suggested_tag": "Project Alpha", // string | null
  "generation_time_ms": 1250,
  "tokens_used": 450
}
```

**Error Responses:**

- `400 Bad Request`: Invalid content length or format
- `504 Gateway Timeout`: AI generation timeout (>60s)
- `429 Too Many Requests`: Rate limit exceeded
- `503 Service Unavailable`: AI service error

#### AI Generation Logging (Backend Implementation Note)

⚠️ **SECURITY**: INSERT to `llm_generations` MUST be performed server-side using Supabase Service Role Key. RLS on `llm_generations` allows only SELECT for authenticated users. Never expose service role key to client code.

Important: The `POST /api/ai/generate` endpoint does NOT directly insert into `llm_generations` via client requests.

Implementation Flow:

1. Client calls `POST /api/ai/generate`.
2. Backend service (using Supabase Service Role Key) performs:
   - Call to OpenRouter API
   - INSERT into `llm_generations` with generation metrics
   - Return summary to client

Why Service Role Key:

- RLS on `llm_generations` allows only SELECT for authenticated users.
- INSERT/UPDATE/DELETE reserved for backend service.
- Prevents client tampering with generation logs.

Backend Code Pattern:

```ts
// Backend service (not client)
const { data, error } = await supabaseServiceRole.from("llm_generations").insert({
  note_id: null, // or note.id after save
  user_id: userId || null, // null for anonymous
  model_name: "x-ai/grok-4-fast",
  generation_time_ms: elapsed,
  tokens_used: response.usage.total_tokens,
  status: "success",
  error_message: null,
});
```

Security: Never expose the service role key to client-side code.

---

### 2.2 Notes Management

#### GET /api/notes

Get user's notes with filtering and pagination.

**Authentication:** Required (Bearer JWT)

**Query Parameters:**

- `tag_id` (UUID, optional): Filter by specific tag
- `goal_status` (enum, optional): Filter by goal achievement status
- `date_from` (date, optional): Filter from date (YYYY-MM-DD)
- `date_to` (date, optional): Filter to date (YYYY-MM-DD)
- `page` (number, optional, default: 1): Page number
- `limit` (number, optional, default: 20, max: 100): Items per page
- `include_shared` (boolean, optional, default: false): Include notes from shared tags
- `sort_by` (enum, optional, default: 'meeting_date'): Sort by 'meeting_date' | 'created_at' | 'updated_at'. Secondary sort: id DESC for stable pagination
- `order` (enum, optional, default: 'desc'): Order 'asc' | 'desc'

**Implementation Note:** All queries use secondary sort by id DESC for deterministic pagination.

**Response Headers:**

- `X-Total-Count`: Total number of notes matching filters (ignores pagination)

**Success Response (200):**

```json
{
  "notes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "summary_text": "Meeting summary...", // string | null
      "goal_status": "achieved", // enum: "achieved" | "not_achieved" | "undefined" | null
      "meeting_date": "2025-10-19",
      "is_ai_generated": true, // boolean
      "created_at": "2025-10-19T10:00:00Z",
      "updated_at": "2025-10-19T10:00:00Z",
      "tag": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Project Alpha"
      },
      "is_owner": true, // boolean
      "has_public_link": false // boolean
    }
  ],
  "pagination": {
    "page": 1, // number
    "limit": 20, // number
    "total": 42, // number
    "total_pages": 3 // number
  }
}
```

Note: Full `original_content` is available only in the detail endpoint `GET /api/notes/{id}`.

#### POST /api/notes

Create new note (requires authentication).

**Authentication:** Required (Bearer JWT)

**Request Body:**

```json
{
  "original_content": "Raw meeting notes content...", // string, required, max 5000 chars
  "summary_text": null, // string | null, optional, nullable
  "goal_status": "achieved", // enum: "achieved" | "not_achieved" | "undefined" | null, optional, nullable
  "suggested_tag": "Project Alpha", // string | null, optional, nullable
  "meeting_date": "2025-10-19", // date, optional, format YYYY-MM-DD
  "tag_id": "550e8400-e29b-41d4-a716-446655440000", // uuid, optional if tag_name provided
  "tag_name": "Project Alpha", // string, optional if tag_id provided
  "is_ai_generated": true // boolean, optional, default false when summary_text is null
}
```

Validation Notes:

- Exactly one of `tag_id` or `tag_name` must be provided (XOR logic).
  - If `tag_id` provided: Use existing tag by UUID.
  - If `tag_name` provided: Find existing tag (case-insensitive) or create new tag in same transaction.
- `summary_text`: Can be omitted entirely (optional), explicitly set to null (nullable), or provided as string. If null on creation, `is_ai_generated` is automatically set to `false`.
- `goal_status`: Can be omitted (optional), explicitly set to null (nullable), or set to one of the enum values.
- `suggested_tag`: Can be omitted (optional), explicitly set to null (nullable), or provided as string.
- If `meeting_date` is omitted, database DEFAULT CURRENT_DATE applies.

AI Generation Logging:

- When saving AI-generated note (`is_ai_generated: true`), the generation should already be logged in `llm_generations` from prior `POST /api/ai/generate` call.
- Backend updates `llm_generations.note_id` after note creation (using service role).
- Manual notes (`is_ai_generated: false`) do not create generation log entries.

**Success Response (201):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "original_content": "Raw meeting notes...",
  "summary_text": "Meeting summary...", // string | null
  "goal_status": "achieved", // enum: "achieved" | "not_achieved" | "undefined" | null
  "suggested_tag": "Project Alpha", // string | null
  "meeting_date": "2025-10-19",
  "is_ai_generated": true,
  "created_at": "2025-10-19T10:00:00Z",
  "updated_at": "2025-10-19T10:00:00Z",
  "tag": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Project Alpha"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Validation errors (content length, missing/invalid tag_id or tag_name, both tag_id and tag_name provided)
- `409 Conflict`: Tag name conflict during auto-creation (race condition - tag was created by another user between lookup and insert). Solution: retry request (tag already exists, so it will be used)
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Tag belongs to different user (when using tag_id)

#### GET /api/notes/{id}

Get specific note details.

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Note identifier

**Success Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "original_content": "Raw meeting notes...",
  "summary_text": "Meeting summary...", // string | null
  "goal_status": "achieved", // enum: "achieved" | "not_achieved" | "undefined" | null
  "suggested_tag": "Project Alpha", // string | null
  "meeting_date": "2025-10-19",
  "is_ai_generated": true,
  "created_at": "2025-10-19T10:00:00Z",
  "updated_at": "2025-10-19T10:00:00Z",
  "tag": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Project Alpha"
  },
  "is_owner": true, // boolean
  "public_link": {
    // object | null
    "token": "550e8400-e29b-41d4-a716-446655440004",
    "is_enabled": true,
    "url": "/public/550e8400-e29b-41d4-a716-446655440004"
  }
}
```

Visibility Rules: `public_link` is only present for owners; for recipients (shared tag access) this field is always `null`.

**Error Responses:**

- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: No access to note (not owner or shared tag recipient)
- `404 Not Found`: Note doesn't exist

#### PATCH /api/notes/{id}

Update note fields (owner only, partial update).

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Note identifier

**Request Body** (all fields optional):

```json
{
  "summary_text": "Updated summary...", // string | null, optional, nullable
  "goal_status": "not_achieved", // enum: "achieved" | "not_achieved" | "undefined" | null, optional, nullable
  "meeting_date": "2025-10-20", // date, optional, format YYYY-MM-DD
  "tag_id": "550e8400-e29b-41d4-a716-446655440002" // uuid, optional
}
```

**Success Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "original_content": "Raw meeting notes...",
  "summary_text": "Updated summary...", // string | null
  "goal_status": "not_achieved", // enum: "achieved" | "not_achieved" | "undefined" | null
  "suggested_tag": "Project Alpha", // string | null
  "meeting_date": "2025-10-20",
  "is_ai_generated": true,
  "created_at": "2025-10-19T10:00:00Z",
  "updated_at": "2025-10-19T10:05:00Z",
  "tag": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Project Alpha"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Validation errors or empty request body
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not note owner or invalid tag_id
- `404 Not Found`: Note doesn't exist

#### DELETE /api/notes/{id}

Delete note (owner only).

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Note identifier

**Success Response (204):**
Empty response body

**Error Responses:**

- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not note owner
- `404 Not Found`: Note doesn't exist

---

### 2.3 Tags Management

#### GET /api/tags

Get user's tags with note counts.

**Authentication:** Required (Bearer JWT)

**Query Parameters:**

- `include_shared` (boolean, optional, default: false): Include tags shared with user

**Response Headers:**

- `X-Total-Count`: Total number of tags

**Success Response (200):**

```json
{
  "tags": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Project Alpha",
      "created_at": "2025-10-19T09:00:00Z",
      "updated_at": "2025-10-19T09:00:00Z",
      "note_count": 5,
      "is_owner": true,
      "shared_recipients": 2 // only for owned tags
    }
  ]
}
```

#### POST /api/tags

Create new tag.

**Authentication:** Required (Bearer JWT)

**Request Body:**

```json
{
  "name": "Project Alpha" // string, required, case-insensitive unique per user
}
```

**Success Response (201):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Project Alpha",
  "created_at": "2025-10-19T09:00:00Z",
  "updated_at": "2025-10-19T09:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid name format (empty, too long, invalid characters)
- `409 Conflict`: Tag name already exists (case-insensitive conflict)
- `401 Unauthorized`: Missing or invalid authentication

#### PATCH /api/tags/{id}

Update tag name (owner only).

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Tag identifier

**Request Body:**

```json
{
  "name": "Project Beta" // string, required
}
```

**Success Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Project Beta",
  "created_at": "2025-10-19T09:00:00Z",
  "updated_at": "2025-10-19T10:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid name format (empty, too long, invalid characters)
- `409 Conflict`: Tag name already exists (case-insensitive conflict)
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not tag owner
- `404 Not Found`: Tag doesn't exist

#### DELETE /api/tags/{id}

Delete tag (owner only, restricted if notes exist).

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Tag identifier

**Success Response (204):**
Empty response body

**Error Responses:**

- `409 Conflict`: Cannot delete tag with existing notes (foreign key constraint)
- `400 Bad Request`: Invalid request format
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not tag owner
- `404 Not Found`: Tag doesn't exist

Implementation Note:

- Database Behavior: ON DELETE RESTRICT on `notes.tag_id` prevents deletion.
- Return clear message: "Cannot delete tag '{name}' - {count} note(s) still use this tag. Reassign notes first."

---

### 2.4 Tag Access Management

#### GET /api/tags/{id}/access

Get recipients with access to tag.

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Tag identifier

**Success Response (200):**

```json
{
  "recipients": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "email": "user@example.com",
      "granted_at": "2025-10-19T09:30:00Z"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not tag owner
- `404 Not Found`: Tag doesn't exist

#### POST /api/tags/{id}/access

Grant access to tag for recipient.

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Tag identifier

**Request Body:**

```json
{
  "recipient_email": "user@example.com" // string, required, valid email
}
```

**Success Response (201):**

```json
{
  "recipient_id": "550e8400-e29b-41d4-a716-446655440010",
  "email": "user@example.com",
  "granted_at": "2025-10-19T09:30:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid email or user doesn't exist
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not tag owner
- `404 Not Found`: Tag doesn't exist
- `409 Conflict`: Access already granted to this user

**Implementation Note: Email to User ID Resolution**

The endpoint accepts `recipient_email` but the database requires `recipient_id` (UUID).

Options for implementation:

1. Supabase Service Role Key: Use service role to query `auth.users` table.
   ```ts
   const { data } = await supabaseAdmin.auth.admin.listUsers();
   const user = data.users.find((u) => u.email === recipient_email);
   ```
2. Database Function (preferred for security):
   ```sql
   create function lookup_user_by_email(email text)
   returns uuid
   security definer
   language sql
   stable
   as $$
     select id from auth.users where lower(email) = lower($1) and email_confirmed_at is not null;
   $$;
   ```
3. Supabase Admin API: Use @supabase/supabase-js admin methods.

Error Handling:

- 400 Bad Request: "User with email {email} not found"
- 400 Bad Request: "User has not confirmed their email address"

Request Body Note: Email must belong to an existing registered user with confirmed email.

#### DELETE /api/tags/{id}/access/{recipient_id}

Revoke access to tag from recipient.

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Tag identifier
- `recipient_id` (UUID, required): Recipient user identifier

**Success Response (204):**
Empty response body

**Error Responses:**

- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not tag owner
- `404 Not Found`: Tag or access record doesn't exist

---

### 2.5 Public Links Management

#### POST /api/notes/{id}/public-link

Create or re-enable public link for note.

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Note identifier

**Behavior**:

- If no public link exists: Creates new link with new UUID token.
- If link exists and `is_enabled = false`: Re-enables link WITHOUT rotating token.
- If link exists and `is_enabled = true`: Returns existing link (idempotent).
- Security Note: Token is NEVER rotated for existing links via this endpoint.

**Implementation Note: Token Rotation**
This endpoint NEVER rotates tokens for security. To rotate token, use POST /api/notes/{id}/public-link/rotate endpoint (see below).

**Success Response (201 or 200)**:

- `201 Created`: New link created
- `200 OK`: Existing link returned or re-enabled

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440020",
  "url": "/public/550e8400-e29b-41d4-a716-446655440020",
  "is_enabled": true,
  "created_at": "2025-10-19T10:00:00Z",
  "is_new": true
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not note owner
- `404 Not Found`: Note doesn't exist

#### PATCH /api/notes/{id}/public-link

Toggle public link enabled/disabled status (partial update).

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Note identifier

**Request Body:**

```json
{
  "is_enabled": false // boolean, required
}
```

**Success Response (200):**

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440020",
  "url": "/public/550e8400-e29b-41d4-a716-446655440020",
  "is_enabled": false,
  "updated_at": "2025-10-19T10:05:00Z"
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not note owner
- `404 Not Found`: Note or public link doesn't exist

#### POST /api/notes/{id}/public-link/rotate

Rotate public link token (invalidates old token, creates new one).

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Note identifier

**Behavior**:

- Invalidates the current public link token
- Generates a new UUID token
- Preserves `is_enabled` status
- Returns new token in response

**Security Note:** Old token becomes immediately invalid. Any existing shared links will stop working.

**Success Response (200):**

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440021", // new token
  "url": "/public/550e8400-e29b-41d4-a716-446655440021",
  "is_enabled": true,
  "created_at": "2025-10-19T10:00:00Z", // original creation time
  "updated_at": "2025-10-19T10:10:00Z" // rotation time
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not note owner
- `404 Not Found`: Note or public link doesn't exist

**Implementation Note:**
This is a convenience endpoint that combines DELETE + POST in a single atomic operation.
Alternative: Client can achieve the same by calling DELETE then POST sequentially.

#### DELETE /api/notes/{id}/public-link

Delete public link for note.

**Authentication:** Required (Bearer JWT)

**Path Parameters:**

- `id` (UUID, required): Note identifier

**Success Response (204):**
Empty response body

**Error Responses:**

- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not note owner
- `404 Not Found`: Note or public link doesn't exist

---

### 2.6 Public Access (Anonymous)

#### GET /api/public/{token}

Get public note summary by token (no authentication required).

**Path Parameters:**

- `token` (UUID, required): Public access token

**Success Response (200):**

```json
{
  "summary_text": "Meeting summary...", // string | null
  "meeting_date": "2025-10-19",
  "goal_status": "achieved", // enum: "achieved" | "not_achieved" | "undefined" | null
  "created_at": "2025-10-19T10:00:00Z"
}
```

Note: `created_at` represents when the public link was first created (from `public_links.created_at`).

**Response Headers:**

- `X-Robots-Tag: noindex, nofollow`
- `Cache-Control: private, no-cache`

**Error Responses:**

- `404 Not Found`: Invalid token or link disabled
- `429 Too Many Requests`: Rate limit exceeded (1,000 views/day per token)

---

### 2.7 User Management

#### GET /api/user/profile

Get current user profile.

**Authentication:** Required (Bearer JWT)

**Success Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "email": "user@example.com",
  "created_at": "2025-10-01T12:00:00Z"
}
```

#### DELETE /api/user/account

Delete user account and all associated data.

**Authentication:** Required (Bearer JWT)

**Request Body:**

```json
{
  "confirmation_email": "user@example.com" // string, required, must match user email
}
```

**Success Response (204):**
Empty response body

**Error Responses:**

- `400 Bad Request`: Email confirmation mismatch
- `401 Unauthorized`: Missing or invalid authentication

---

### 2.8 Analytics & Statistics

#### GET /api/user/stats

Get user's AI generation statistics.

**Authentication:** Required (Bearer JWT)

**Success Response (200):**

```json
{
  "total_generations": 125,
  "successful_generations": 120,
  "failed_generations": 5,
  "total_tokens": 45000,
  "avg_time_ms": 1250,
  "total_notes": 50,
  "total_tags": 8
}
```

Implementation Note:
Fields `total_generations`, `successful_generations`, `failed_generations`, `total_tokens`, `avg_time_ms` are fetched from `user_generation_stats` view.
Additional fields require separate queries:

- `total_notes`: SELECT COUNT(\*) FROM notes WHERE user_id = auth.uid()
- `total_tags`: SELECT COUNT(\*) FROM tags WHERE user_id = auth.uid()

## 3. Authentication and Authorization

### Authentication Mechanism

- **Supabase Authentication** with JWT tokens
- **Anonymous Access** for AI generation and public links
- **Bearer Token** format: `Authorization: Bearer <jwt_token>`

### Authorization Levels

1. **Anonymous**: AI generation, public link access
2. **Authenticated User**: Full CRUD on owned resources
3. **Shared Tag Recipient**: Read-only access to notes with shared tags
4. **Note Owner**: Full control over notes, public links, tag access

### Implementation Details

- **Row Level Security (RLS)** enforced at database level via Supabase
- **Service Role Key** used for public link access (bypasses RLS)
- **JWT Claims** contain user ID (`auth.uid()`) for policy enforcement
- **Rate Limiting** implemented at application level

### Token Visibility Rules

- `public_link.token` is only visible to note owners.
- Recipients accessing notes via shared tags see `public_link: null`.
- Public link URLs are never exposed through list endpoints.
- Tokens are UUID v4 and unguessable.

## 4. Validation and Business Logic

### Content Validation

- **Original Content**: Required, maximum 5000 characters
- **Summary Text**: Optional and nullable when creating/updating notes, maximum 2000 characters when provided
  - Can be omitted entirely (optional)
  - Can be explicitly set to null (nullable) to support draft notes without AI generation
  - If null on creation, `is_ai_generated` is automatically set to `false`
- **Goal Status**: Optional and nullable with enum values ('achieved', 'not_achieved', 'undefined') or null
- **Suggested Tag**: Optional and nullable string
- **Meeting Date**: Valid date format (YYYY-MM-DD), defaults to current date
- **Tag Names**: Case-insensitive, unique per user
- **Email Addresses**: Valid email format for tag access

### Business Logic Rules

1. **AI Generation**: Available without authentication, encourages registration after generation
2. **Note Creation**: Requires authentication and valid tag assignment
3. **Tag Uniqueness**: Enforced per user with case-insensitive comparison
4. **Access Control**: Tag owners can grant/revoke read-only access to recipients
5. **Public Sharing**: Only summary visible via public links (never original content)
6. **Data Deletion**: Complete cascade deletion on account removal (GDPR compliance)
7. **Goal Status**: Nullable with enum values ('achieved', 'not_achieved', 'undefined')

### Performance Constraints

- **AI Generation Timeout**: Maximum 60 seconds per PRD requirements

### Rate Limiting (Per-Endpoint Breakdown)

#### Anonymous Endpoints

- `POST /api/ai/generate`: 100 requests/day per IP
- `GET /api/public/{token}`: 1,000 views/day per token
  - After limit: Return 429 with `Retry-After` header

#### Authenticated Endpoints (Per User)

- `POST /api/notes`: 500 requests/day
- `PATCH /api/notes/{id}`: 1,000 requests/day
- `DELETE /api/notes/{id}`: 100 requests/day
- `GET /api/notes`: 5,000 requests/hour (read-heavy)
- `POST /api/tags`: 100 requests/day
- `POST /api/tags/{id}/access`: 50 requests/hour (prevent abuse)
- All other GET endpoints: 10,000 requests/hour

#### Rate Limit Response Headers

**Note:** All endpoints return rate limit headers in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1640000000
Retry-After: 3600
```

- **Pagination**: Default 20 items, maximum 100 items per page
- **Content Length**: Enforced both client-side and database level

### Error Handling

- **Consistent Error Format**: JSON with `error`, `message`, and optional `details`
- **Validation Errors**: Detailed field-specific error messages
- **Rate Limiting**: Include retry-after headers and clear messages
- **AI Service Errors**: Graceful degradation with user-friendly messages
- **Authentication Errors**: Clear distinction between missing and invalid tokens

### Monitoring and Logging

- **AI Generation Metrics**: Track generation time, token usage, success/failure rates
- **Performance Monitoring**: API response times, database query performance
- **Error Tracking**: Detailed logging for debugging and analytics
- **Usage Analytics**: User activity patterns, feature adoption metrics

## 5. Performance & Query Optimization

### 5.1 Index Utilization Mapping

Mapping API endpoints to database indexes from db-plan.md.

#### Notes Endpoints

GET /api/notes

- Filter by user_id: Uses idx_notes_user_meeting_date (composite)
  - Query: WHERE user_id = ? ORDER BY meeting_date DESC
- Filter by tag_id: Uses idx_notes_tag_id
  - Query: WHERE tag_id = ?
- Filter by goal_status: Uses idx_notes_goal_status
  - Query: WHERE goal_status = ?
- Date range filtering: Uses idx_notes_user_meeting_date (composite)
  - Query: WHERE user_id = ? AND meeting_date BETWEEN ? AND ?
  - Important: Always scope date queries to user_id

Combined Filters (best performance):

```sql
-- Optimal: Uses composite index
WHERE user_id = ? AND meeting_date >= ?
ORDER BY meeting_date DESC

-- Good: Uses two indexes
WHERE user_id = ? AND tag_id = ?

-- Acceptable: Uses single index
WHERE goal_status = ?

-- Avoid: No index, full scan
WHERE meeting_date >= ?  -- without user_id
```

Tag Access Endpoints

GET /api/notes?include_shared=true

- Shared notes lookup: Uses idx_tag_access_recipient_tag (composite)
  - Query: JOIN tag_access ON recipient_id = ? AND tag_id = notes.tag_id

GET /api/tags/{id}/access

- Access list: Uses idx_tag_access_tag_id
  - Query: WHERE tag_id = ?

Public Links

GET /api/public/{token}

- Token lookup: Uses UNIQUE constraint index (automatic)
  - Query: WHERE token = ? AND is_enabled = TRUE

LLM Generations / Stats

GET /api/user/stats

- View query: Uses user_generation_stats view
- Additional queries:
  - COUNT(\*) FROM notes WHERE user_id = ? — uses idx_notes_user_meeting_date
  - COUNT(\*) FROM tags WHERE user_id = ? — uses unique_tag_name_per_user

### 5.2 Query Performance Guidelines

1. Always scope to user context
   - Use user_id in WHERE clause whenever possible
   - Leverage composite indexes with leftmost prefix rule
   - All list endpoints MUST include WHERE user_id = auth.uid() to utilize composite indexes:
     - GET /api/notes: uses idx_notes_user_meeting_date
     - GET /api/tags: uses unique_tag_name_per_user (leftmost prefix)
   - Never perform global queries without user scope in MVP
2. Avoid global queries in MVP
   - Don't query all notes by date without user_id
   - Don't scan all tags without owner/recipient filter
3. Pagination optimization
   - Use cursor-based pagination for large datasets (post-MVP)
   - Current offset/limit acceptable for MVP scale
4. Join optimization
   - Notes ← Tags: Uses FK index idx_notes_tag_id
   - Notes ← Tag Access: Uses idx_tag_access_recipient_tag
   - All joins are indexed

### 5.3 Database Query Examples

Endpoint: GET /api/notes?tag_id={id}&date_from={date}&page=1

Generated Query:

```sql
SELECT n.*, t.name as tag_name
FROM notes n
JOIN tags t ON n.tag_id = t.id
WHERE n.user_id = $1
  AND n.tag_id = $2
  AND n.meeting_date >= $3
ORDER BY n.meeting_date DESC
LIMIT 20 OFFSET 0;
```

Index Selection: PostgreSQL uses idx_notes_user_meeting_date (most selective for ORDER BY when scoped by user).

---

Endpoint: GET /api/notes?include_shared=true

Generated Query:

```sql
-- Own notes
SELECT n.*, t.name, TRUE as is_owner
FROM notes n
JOIN tags t ON n.tag_id = t.id
WHERE n.user_id = $1

UNION ALL

-- Shared notes
SELECT n.*, t.name, FALSE as is_owner
FROM notes n
JOIN tags t ON n.tag_id = t.id
JOIN tag_access ta ON ta.tag_id = t.id
WHERE ta.recipient_id = $1

ORDER BY meeting_date DESC
LIMIT 20 OFFSET 0;
```

Index Selection: Uses idx_notes_user_meeting_date for own notes and idx_tag_access_recipient_tag for shared notes.

### 5.4 Performance Monitoring

Track these metrics for query optimization:

1. Query execution time (per endpoint)
   - Target: p95 < 100ms for GET, < 200ms for POST/PATCH
2. Index hit rate
   - Target: > 99% index usage, < 1% sequential scans
3. Connection pool utilization
   - Monitor Supabase connection pool stats
4. N+1 query detection
   - Use eager loading for notes → tags joins
   - Batch load public_link data per note list

### 5.5 Caching Strategy (Optional, Post-MVP)

Endpoints suitable for caching:

- GET /api/tags: User's tag list (cache for 5 min)
- GET /api/user/stats: Stats view (cache for 15 min)
- GET /api/public/{token}: Public summaries (cache for 1 hour)

Not suitable for caching:

- GET /api/notes: Real-time note lists
- Any POST/PATCH/DELETE endpoints
