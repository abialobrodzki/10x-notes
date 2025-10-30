# API Endpoint Implementation Plan: GET /api/share/{token}

## 1. Endpoint Overview

Returns note via public link (token). **No authentication** - available to everyone. Checks if link is active.

## 2. Request Details

- **Method**: GET
- **URL**: `/api/share/{token}`
- **Authentication**: **None** (public endpoint)
- **Rate Limiting**: 1000/day per token
- **Path Parameters**: `token` (string, UUID v4 format) - Public link token

## 3. Types Used

- **DTO**: `PublicNoteDTO` (from types.ts)
  ```typescript
  Pick<NoteEntity, "summary_text" | "meeting_date" | "goal_status"> &
    {
      created_at: PublicLinkEntity["created_at"], // When link was created
    };
  ```
- **Services**: `PublicLinksService.getPublicNote(token)` using supabaseAdmin

## 4. Response Details

**Success Response (200 OK)**:

```json
{
  "summary_text": "Meeting summary...",
  "meeting_date": "2025-10-19",
  "goal_status": "achieved",
  "created_at": "2025-10-19T10:00:00Z"
}
```

**Response Headers**:

- `X-Robots-Tag: noindex, nofollow`
- `Cache-Control: private, no-cache`

**NOTE**:

- Flat structure (no nested `note`, `metadata`)
- `created_at` represents when the public link was first created (from `public_links.created_at`), **NOT** note creation time
- NOT returned: `original_content`, `id`, `user_id`, `tag_name`, `is_ai_generated`, `suggested_tag`

**Error Responses**:

- `404 Not Found`: Token doesn't exist, link disabled
- `429 Too Many Requests`: Rate limit exceeded (1000/day per token)
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Rate Limiting**: 1000 req/day per token (protection against scraping)
2. **Validation**: Token format (UUID)
3. **Fetch note data**: Using supabaseAdmin (bypasses RLS for public access)
   ```sql
   SELECT notes.summary_text, notes.meeting_date, notes.goal_status,
          public_links.created_at
   FROM notes
   JOIN public_links ON public_links.note_id = notes.id
   WHERE public_links.token = $token
     AND public_links.is_enabled = true
   ```
4. **Check active**: `is_enabled = true` (checked in query)
5. **Transform to DTO**: Flat structure with 4 fields (summary_text, meeting_date, goal_status, created_at)
6. **Response Headers**: Set X-Robots-Tag and Cache-Control
7. **Return**: 200 with PublicNoteDTO

**Security Note**: This operation uses `supabaseAdmin` client (service role key) from `src/lib/services/supabase-admin.ts` to bypass RLS for public access. NEVER expose this client to frontend code.

## 6. Security Considerations

- **No authentication**: Public endpoint (by design)
- **Limited data**: Return ONLY: `summary_text`, `meeting_date`, `goal_status`, `created_at` (public link)
  - NOT returned: `original_content`, `id`, `user_id`, `tag_name`, `is_ai_generated`, `suggested_tag`
- **Rate limiting per token**: 1000 req/day (prevent scraping)
- **Token validation**: Check `is_enabled = true`
- **No error details**: Return 404 for all access denial cases (don't reveal if token exists)
- **SEO protection**: Headers `X-Robots-Tag: noindex, nofollow`
- **Cache control**: `Cache-Control: private, no-cache`
- **Service role usage**: supabaseAdmin bypasses RLS for public access

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Token doesn't exist | 404 | "Public link not found" | Check URL |
|| Link disabled (is_enabled=false) | 404 | "Public link not found" | Don't reveal reason |
|| Rate limit exceeded | 429 | "Rate limit exceeded" | Wait 24h |
|| DB error | 500 | "Internal server error" | Retry |

**Important**: All access denial cases return the same 404 message (security best practice). Field `expires_at` doesn't exist in MVP database schema.

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

**Expected response times**:

- P50: <30ms
- P95: <60ms

**Optimizations**:

- **Index**: `public_links(token)` UNIQUE for fast lookup
- **Single query**: JOIN notes + tag in one query
- **Selective fields**: Fetch only needed columns
- **Cache**: Optionally cache for 5 min (but beware of `is_enabled` changes)

**Bottlenecks**:

- High traffic may require read replicas
- Rate limiting per token (1000/day) - post-MVP: Cloudflare rate limiting

**Scaling**:

- CDN caching for popular links (with short TTL)
- Read replicas in Supabase
- Rate limiting via Cloudflare (post-MVP)

**Note**: Field `expires_at` doesn't exist in MVP - all links indefinite (can be disabled manually via `is_enabled`)

## 9. Implementation Steps

### Step 1: PublicLinksService

- Create `src/lib/services/public-links.service.ts`
- Method `getPublicNote(token: string): Promise<PublicNoteDTO | null>`:
  - JOIN notes with public_links by token
  - Ensure `is_enabled = true`
  - Return 4 fields (summary_text, meeting_date, goal_status, created_at)
  - Return null if not found or disabled

### Step 2: API Endpoint

- Create `src/pages/api/share/[token].ts`
- Add `export const prerender = false`
- Export GET handler:
  - No auth
  - Rate limiting per token (1000/day)
  - Validate token format (UUID)
  - Call `publicLinksService.getPublicNote()`
  - Return 404 for all failure cases
  - Set headers: X-Robots-Tag, Cache-Control

### Step 3: Rate Limiting Middleware

- Create `src/middleware/rate-limit.ts` supporting per-token limits
