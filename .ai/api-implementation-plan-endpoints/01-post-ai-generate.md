# API Endpoint Implementation Plan: POST /api/ai/generate

## 1. Endpoint Overview

Endpoint enables AI summary generation from raw meeting notes. This is an anonymous endpoint (no authentication required) that encourages users to test functionality before registration. Accepts note content (up to 5000 characters) and returns a structured summary containing: summary text, goal status, suggested tag, and generation metrics.

## HTTP Status Codes Reference

This API uses the following HTTP status codes:

- 200 OK - Successful GET/PATCH request
- 201 Created - Successful POST request
- 204 No Content - Successful DELETE request
- 400 Bad Request - Invalid input data
- 401 Unauthorized - Missing or invalid authentication
- 403 Forbidden - Valid auth but insufficient permissions
- 404 Not Found - Resource not found
- 408 Request Timeout - Request exceeded timeout limit
- 409 Conflict - Resource conflict (duplicate, race condition)
- 429 Too Many Requests - Rate limit exceeded
- 500 Internal Server Error - Unexpected server error
- 503 Service Unavailable - External service unavailable

## 2. Request Details

- **HTTP Method**: POST
- **URL Structure**: `/api/ai/generate`
- **Authentication**: None (anonymous call)
- **Content-Type**: `application/json`

**Parameters**:

- **Required**:
  - `original_content` (string) - Raw note content, max 5000 characters
- **Optional**:
  - `model_name` (string) - AI model name, default: `'openai/gpt-4o-mini'`

**Request Body**:

```json
{
  "original_content": "Raw meeting note content...",
  "model_name": "openai/gpt-4o-mini"
}
```

## 3. Types Used

**DTOs**:

- `AiSummaryDTO` - Returned generation result
- `GenerateAiSummaryCommand` - Input data

**Database types**:

- `GoalStatus` - Enum ('achieved' | 'not_achieved' | 'undefined')
- `LlmGenerationEntity` - For metrics logging

**Zod Schema**:

```typescript
export const generateAiSummarySchema = z.object({
  original_content: z.string().min(1, "Content is required").max(5000, "Content exceeds 5000 character limit"),
  model_name: z.string().optional().default("openai/gpt-4o-mini"),
});
```

## 4. Response Details

**Success Response (200)**:

```json
{
  "summary_text": "Generated meeting summary...",
  "goal_status": "achieved",
  "suggested_tag": "Project Alpha",
  "generation_time_ms": 1250,
  "tokens_used": 450
}
```

**Error Responses**:

- `400 Bad Request`: Invalid content length or format
- `408 Request Timeout`: AI generation timeout (>30s)
- `429 Too Many Requests`: Rate limit exceeded (100 calls/day per IP)
- `503 Service Unavailable`: AI service error (OpenRouter)

## 5. Data Flow

1. **Input validation**: Check content length (max 5000 characters) and data format
2. **Rate Limiting**: Verify limit of 100 calls/day per IP
3. **Fetch user_id**: Optional - if user is logged in, get ID from JWT
4. **OpenRouter API call**:
   - Build prompt from template
   - Send request with 30s timeout
   - Wait for JSON response
5. **Parse response**: Extract `summary_text`, `goal_status`, `suggested_tag`
6. **Log generation**: Asynchronously save metric to `llm_generations` (service role)
7. **Return result**: Send summary to client

**External service interactions**:

- OpenRouter API (https://openrouter.ai/api/v1/chat/completions)
- Supabase (service role) - write to `llm_generations`

## 6. Security Considerations

- **Rate Limiting**: Limit 100 calls/day per IP address (abuse prevention)
- **Input Validation**: Validate content length before sending to AI
- **Service Role Key**: Used only server-side for logging, never exposed to client
- **Timeout Protection**: Maximum 30s for generation, then abort
- **No sensitive data**: Endpoint doesn't save content to DB without user consent
- **CORS**: Appropriate headers for secure cross-origin requests

## 7. Error Handling

|| Scenario | Status Code | Message | Action |
||------------|-------------|-----------|-------|
|| Content > 5000 chars | 400 | "Content exceeds 5000 character limit" | User must shorten text |
|| Invalid model name | 400 | "Invalid model name" | Use default model |
|| Rate limit exceeded | 429 | "Rate limit exceeded. Try again in X seconds" | Wait X seconds |
|| OpenRouter timeout (>30s) | 408 | "AI generation timeout" | Retry or use shorter content |
|| OpenRouter API error | 503 | "AI service temporarily unavailable" | Retry later |
|| DB logging error | 500 | (Console logging, doesn't block response) | Return summary despite logging error |

**Retry strategy**:

- No automatic retry for user
- Log errors to console
- Graceful degradation - logging error doesn't block result return

NOTE: This endpoint uses extended HTTP status codes (403, 408, 409, 429, 503) for semantic precision beyond the base REST standard.

## 8. Performance Considerations

**Expected times**:

- AI generation: 1-3 seconds (P50)
- Maximum timeout: 30 seconds
- Target P95: <5 seconds

**Optimizations**:

- **Asynchronous logging**: Write to `llm_generations` doesn't block response
- **Connection pooling**: Reuse connections to OpenRouter and Supabase
- **Streaming (future)**: Possibility to add streaming response for better UX
- **Caching (future)**: Cache for identical queries (post-MVP)

**Bottlenecks**:

- OpenRouter API response time (not controlled by application)
- Rate limiting may block users behind public IPs (offices, VPNs)

**Monitoring**:

- Track `generation_time_ms` in database
- Count success/failure in `llm_generations`
- Rate limit hits (logs)

## 9. Implementation Steps

### Step 1: Infrastructure

- Create `src/lib/services/supabase-admin.ts` (service role client)
- Add environment variables: `OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Configure rate limiting middleware (`src/lib/middleware/rate-limit.middleware.ts`)

### Step 2: Validation

- Create Zod schema in `src/lib/validators/ai.schemas.ts`
- Define `GenerateAiSummaryInput` type

### Step 3: AI Service

- Implement `AiGenerationService` in `src/lib/services/ai-generation.service.ts`:
  - Method `generateSummary()`
  - Private method `buildPrompt()` - prompt template
  - Private method `callOpenRouter()` - API call with timeout
  - Private method `parseResponse()` - JSON parsing with fallback
  - Private method `logGeneration()` - async DB write

### Step 4: API Endpoint

- Create `src/pages/api/ai/generate.ts`
- Add `export const prerender = false`
- Implement POST handler:
  - Rate limiting check
  - Optional auth (fetch user_id if logged in)
  - Input validation
  - Service call
  - Error handling (timeout, service errors)
  - Return JSON response
