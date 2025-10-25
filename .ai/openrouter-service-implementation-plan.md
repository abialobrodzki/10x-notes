# OpenRouter Service — Implementation Plan (Condensed Version)

Document: Architecture and flow plan for `OpenRouterService`. Contains design decisions, responsibilities, and flow sequences.

---

## 1. Service Description

`OpenRouterService` provides secure, type-safe communication with OpenRouter API for LLM response generation in 10xNotes.

- Abstraction layer over HTTP/timeout/retry/parsing
- Focus on: modularity, type safety, reliability, observability, and security
- Use cases: summary generation, structured extractions (JSON), free-form responses, optional streaming
- Telemetry and cost tracking supported asynchronously (fire-and-forget)
- Per-use-case configuration (timeouts, retry, model, parameters)

---

## 2. Constructor and Configuration

Inputs and responsibilities:

- `supabase`: used exclusively for telemetry (`llm_generations`), no impact on critical path
- `options`: default settings and application-identifying headers

Validation and defaults:

- Required `OPENROUTER_API_KEY` from env; missing → initialization error
- Defaults: `timeoutMs≈30000`, `retryAttempts≈2`, `retryDelayMs≈1000`, `defaultModel='openai/gpt-4o-mini'`, `appUrl`, `appName`
- API endpoint: `https://openrouter.ai/api/v1/chat/completions`

Integration recommendations:

- Create instance per-request or per-endpoint (stateless, depends on telemetry needs)
- Parameterize timeouts and retry limits per specific use case

---

## 3. Public Methods (Description Instead of Code)

### 3.1 `generate<T>()`

Purpose: Main generation method with full type safety.

Flow: validateRequest → buildPayload → callWithRetry → parseResponse → logTelemetry.

Key decisions:

- Generic type `T` describes result schema (for text responses `T=string`)
- `responseSchema` support (JSON Schema) with strict structure enforcement
- Fire-and-forget telemetry (doesn't block client response)
- Returns: `{ data: T, metadata: { modelUsed, tokensUsed, generationTimeMs } }`
- Throws typed errors: `OpenRouterValidationError`, `OpenRouterTimeoutError`, `OpenRouterApiError`, `OpenRouterParseError`

Input/output (logical):

- Input: systemMessage, userMessage, optionally modelName/parameters/responseSchema, userId (for telemetry)
- Output: typed `data` and usage metadata

---

### 3.2 `generateWithSchema<T>()`

Purpose: Convenient wrapper for Zod → JSON Schema → `generate<T>()`.

Flow: zodSchema → convert to JSON Schema → delegate to `generate` → validate result.

Key decisions:

- Simplifies calls where Zod is already used for DTOs
- Optional model and parameter customization (temperature, max_tokens, etc.)

---

### 3.3 `streamGenerate<T>()` (optional)

Purpose: Deliver partial responses (SSE/stream) for long generations.

Flow: validateRequest → establish connection → emit chunks → finalize and metadata.

Key decisions:

- Returns asynchronous stream with result fragments plus final result
- Handles abortion (abort) and reports metrics on completion

---

## 4. Private Methods and Fields (Description Instead of Code)

Configuration fields (readonly):

- `openRouterApiKey`, `openRouterApiUrl`, `timeoutMs`, `retryAttempts`, `retryDelayMs`, `defaultModel`, `appUrl`, `appName`

### 4.1 `validateRequest(request)`

Purpose: Early validation of input and model parameters.

Validates:

- Required: `systemMessage`, `userMessage` (non-empty, not blank)
- `modelName` format: `provider/model-name`
- `responseSchema` (if provided): name + `type='object'`
- Parameters: ranges (`temperature ∈ [0,2]`, `top_p ∈ [0,1]`, `penalties ∈ [-2,2]`, `max_tokens ≥ 1`)
- Message lengths (design boundaries, e.g., ~50k chars) — high-level contract

Errors: throws `OpenRouterValidationError` on contract violation.

---

### 4.2 `buildOpenRouterPayload(request)`

Purpose: Construct payload conforming to OpenRouter specification.

Design assumptions:

- `messages`: `[system, user]`; extensible in future
- `response_format.json_schema`: set when `responseSchema` provided (strict mode)
- Model parameters added layered (temperature, tokens, sampling, penalties)

Output: minimal, consistent payload for transport.

---

### 4.3 `callWithRetry(payload)`

Purpose: Resilient HTTP call with backoff.

Retry rules:

- Attempts: `retryAttempts` with backoff `retryDelayMs * 2^attempt`
- No retry for non-transient errors: `Validation`, `Auth`, `Parse`
- Retry for: `Timeout`, `Network`, `Service`, `RateLimit` (per retryable flags)

---

### 4.4 `callOpenRouterApi(payload)`

Purpose: Low-level `fetch` with timeout control and app-identifying headers.

Assumptions:

- `AbortController` for `timeoutMs`
- Headers: `Authorization: Bearer`, `HTTP-Referer`, `X-Title`
- HTTP error mapping delegated to `handleApiError`

---

### 4.5 `handleApiError(response)`

Purpose: Consistent mapping of HTTP codes → domain error types.

Mapping (examples):

- 401 → `OpenRouterAuthError` (non-trivial config error)
- 429 → `OpenRouterRateLimitError` (retryable)
- 400 → `OpenRouterValidationError` (non-retryable)
- 503/504 → `OpenRouterServiceError` (retryable)
- Other → `OpenRouterApiError(statusCode)` (retryable depending on 5xx)

---

### 4.6 `parseResponse<T>(apiResponse, schema)`

Purpose: Extract content, parse JSON (if schema), verify structure and types.

Validation assumptions:

- `choices[0].message.content` is required
- No schema → return raw text as `T=string`
- With schema → `JSON.parse` and minimal validation per JSON Schema

Errors: `OpenRouterParseError` on missing fields/types or invalid JSON.

---

### 4.7 `validateAgainstSchema(data, schema)` / `matchesType(value, type)`

Purpose: Simple structural and type validation (without heavy runtime validators).

Scope:

- Required fields (`required`)
- Primitive types and simple collections (string/number/boolean/null/array/object)
- No deep semantic validation — that's the job of higher layers or Zod

---

### 4.8 `logGeneration(...)`

Purpose: Asynchronous telemetry logging to Supabase (fire-and-forget).

Rules:

- Never blocks response from main service
- Stores: `userId`, `noteId?`, `modelName`, `status`, `generationTimeMs`, `tokensUsed?`, `errorMessage?`
- Logging errors only to server logs (no exceptions in business path)

---

## 5. Error Handling (Hierarchy)

Retained only class list with codes and `retryable` flag.

- `OpenRouterError` — code: n/a (base); retryable: depends on subclass
- `OpenRouterValidationError` — code: `VALIDATION_ERROR`; retryable: `false`
- `OpenRouterAuthError` — code: `AUTH_ERROR`; retryable: `false`
- `OpenRouterRateLimitError` — code: `RATE_LIMIT_ERROR`; retryable: `true`
- `OpenRouterTimeoutError` — code: `TIMEOUT_ERROR`; retryable: `true`
- `OpenRouterNetworkError` — code: `NETWORK_ERROR`; retryable: `true`
- `OpenRouterServiceError` — code: `SERVICE_ERROR`; retryable: `true`
- `OpenRouterParseError` — code: `PARSE_ERROR`; retryable: `false`
- `OpenRouterApiError(statusCode?)` — code: `API_ERROR`; retryable: `statusCode≥500`

---

## 6. Security

Retained only 6.1 — API key protection (principles):

- Store exclusively in environment variables; no hardcoding
- Never log key (also in headers/stacks); log only prefixes/abbreviations
- Key rotation (e.g., every 90 days); separate keys for dev/stage/prod environments
- Limit exposure: key access only in server layer
- Sensitive logs only server-side (no propagation to client)

---

## 7. Implementation Plan (Steps)

### Step 1 — File Structure

Create files and directories:

- `src/lib/services/openrouter.service.ts` — service implementation
- `src/lib/errors/openrouter.errors.ts` — domain error definitions
- `src/lib/types/openrouter.types.ts` — type interfaces and contracts
- (optional) `src/lib/validators/openrouter.schemas.ts` — place for schemas/conversions

### Step 2 — Domain Errors

Define classes (name → code → retryable):

- `OpenRouterValidationError` → `VALIDATION_ERROR` → `false`
- `OpenRouterAuthError` → `AUTH_ERROR` → `false`
- `OpenRouterRateLimitError` → `RATE_LIMIT_ERROR` → `true`
- `OpenRouterTimeoutError` → `TIMEOUT_ERROR` → `true`
- `OpenRouterNetworkError` → `NETWORK_ERROR` → `true`
- `OpenRouterServiceError` → `SERVICE_ERROR` → `true`
- `OpenRouterParseError` → `PARSE_ERROR` → `false`
- `OpenRouterApiError(statusCode?)` → `API_ERROR` → `statusCode≥500`

### Step 3 — Types and Contracts

Define key interfaces:

- `JSONSchema` (with `type='object'`, `properties`, `required?`, `additionalProperties?`)
- `ModelParameters` (temperature, max_tokens, top_p, penalties)
- `OpenRouterRequest<T>` (systemMessage, userMessage, modelName?, responseSchema?, parameters?)
- `OpenRouterResponse<T>` (`data`, `metadata: { modelUsed, tokensUsed, generationTimeMs }`)
- (internal) `OpenRouterPayload`, `OpenRouterApiResponse`
- `OpenRouterServiceOptions` (timeouts, retries, defaultModel, appUrl, appName)

### Step 4 — Implement `OpenRouterService`

Implement following methods (codeless descriptions; per sections 3–4):

- Constructor (API key validation; default settings; endpoints/headers)
- `generate<T>()` — main generation path (flow and errors as in 3.1)
- `generateWithSchema<T>()` — Zod → JSON Schema → `generate` wrapper
- `streamGenerate<T>()` (optional) — streaming (SSE/chunks) + finalization
- `validateRequest(...)` — validate messages/model/schema/parameters
- `buildOpenRouterPayload(...)` — assemble OpenRouter request (messages, response_format, parameters)
- `callWithRetry(...)` — retry/backoff for transient errors
- `callOpenRouterApi(...)` — `fetch` with `AbortController` and app-identifying headers
- `handleApiError(...)` — map HTTP statuses to domain errors
- `parseResponse<T>(...)` — extract content, `JSON.parse` (if schema), validate
- `validateAgainstSchema(...)` / `matchesType(...)` — simple structure and type validation
- `logGeneration(...)` — telemetry (async, non-blocking)

### Step 5 — Refactor `AiGenerationService` (High-Level Description)

- Replace existing LLM calls with new `OpenRouterService`
- Inject `supabase` from `context.locals`, create service instance with use-case parameters
- Call `generate<T>()` with appropriate `responseSchema` to get typed data
- Map result to existing DTOs (e.g., `AiSummaryDTO`) without additional parsing
- Retain telemetry (generation time, tokens, status) — logged asynchronously
- Parameterize model/temperature for stability (e.g., low temperature for extraction)
- Don't move validation logic to AI service — validate inputs at API/service layer

---

## 8. Summary (5–7 Points)

- Consistent layer for secure, type-safe OpenRouter calls (JSON Schema + generics)
- Reliability through timeout, retry with backoff, and clear error mapping
- Background telemetry (fire-and-forget) — no impact on response latency
- Simple integration with existing services (refactoring without breaking DTO contracts)
- Minimal payload contract and edge validations (input/output)
- API key security (env only, no logging, rotation, server-only access)
- Ready for extensions: streaming, additional models, broader runtime validation
