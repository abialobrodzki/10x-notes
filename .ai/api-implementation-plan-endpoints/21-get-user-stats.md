# API Endpoint Implementation Plan: GET /api/user/stats

## 1. Endpoint Overview

Returns user statistics: AI generation metrics from `user_generation_stats` view and count of notes and tags. Useful for dashboard and AI usage monitoring.

## 2. Request Details

- **Method**: GET
- **URL**: `/api/user/stats`
- **Authentication**: Required (Bearer JWT)
- **Rate Limiting**: 10000/hour per user

## 3. Types Used

- **DTO**: `UserStatsDTO` (from types.ts)
- **DB View**: `user_generation_stats` (aggregates data from llm_generations)
- **Services**: `UserService.getUserStats(userId)` or dedicated `AnalyticsService`

## 4. Response Details

**Success Response (200 OK)**:

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

**FLAT structure** - no nesting (`notes`, `tags`, `public_links`)

**Error Responses**:

- `401 Unauthorized`: Missing token
- `500 Internal Server Error`: DB error

## 5. Data Flow

1. **Authentication**: JWT → `user_id`
2. **Rate Limiting**: 10000 req/hour
3. **Fetch stats** (3 queries):
   a. FROM `user_generation_stats` view WHERE user_id = $user_id:
   - `total_generations`
   - `successful_generations`
   - `failed_generations`
   - `total_tokens`
   - `avg_time_ms`
     b. `SELECT COUNT(*) FROM notes WHERE user_id = $user_id` → `total_notes`
     c. `SELECT COUNT(*) FROM tags WHERE user_id = $user_id` → `total_tags`
4. **Aggregation**: Combine results into flat UserStatsDTO
5. **Return**: 200 with flat structure (7 fields)

**Implementation Note**:
Fields `total_generations`, `successful_generations`, `failed_generations`, `total_tokens`, `avg_time_ms` are fetched from VIEW `user_generation_stats`.

Additional fields require separate queries:

- `total_notes`: SELECT COUNT(\*) FROM notes WHERE user_id = auth.uid()
- `total_tags`: SELECT COUNT(\*) FROM tags WHERE user_id = auth.uid()

## 6. Security Considerations

- **Only own stats**: User sees only their data
- **No sensitive data**: Aggregated statistics, no content exposure

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Missing token | 401 | "Authentication required" | Login |
|| DB error | 500 | "Internal server error" | Retry |

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance

**Expected response times**:

- P50: <50ms
- P95: <100ms

**Optimizations**:

- **Parallel queries**: 3 queries executed in parallel
- **VIEW usage**: `user_generation_stats` aggregates data from `llm_generations` (may be slow for >1000 generations)
- **Indexes**: Utilize existing indexes on `notes(user_id)`, `tags(user_id)`, `llm_generations(user_id)`
- **Cache**: Optionally cache for 5 min (stats change rarely)

**Bottlenecks**:

- VIEW `user_generation_stats` aggregates data from `llm_generations` (may be slow for >1000 generations)
- COUNT queries may be slow for >10k notes/tags
- No denormalization (post-MVP: materialized view for user_generation_stats)

**Scaling**:

- Materialized view for `user_generation_stats` refreshed every 5 min
- Denormalization of counters in `users` table (trigger-based)

## 9. Implementation Steps

### Step 1: Service Layer

- Create `src/lib/services/user.service.ts` or `src/lib/services/analytics.service.ts`
- Method `getUserStats(userId: string): Promise<UserStatsDTO>`:
  - Query VIEW `user_generation_stats`
  - COUNT notes by user_id
  - COUNT tags by user_id
  - Combine into flat DTO

### Step 2: API Endpoint

- Create `src/pages/api/user/stats.ts`
- Add `export const prerender = false`
- Export GET handler:
  - Call `requireAuth()` middleware
  - Rate limiting check (10000/hour)
  - Call service method
  - Return 200 with stats
