/**
 * OpenRouter Service Domain Errors
 *
 * Hierarchy of typed errors for OpenRouter API interactions.
 * Each error includes a unique code and retryable flag for retry logic.
 */

/**
 * Base error class for all OpenRouter-related errors
 */
export class OpenRouterError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.retryable = retryable;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - invalid input parameters or schema
 * Non-retryable (client error)
 */
export class OpenRouterValidationError extends OpenRouterError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", false);
  }
}

/**
 * Authentication error - invalid or missing API key
 * Non-retryable (configuration error)
 */
export class OpenRouterAuthError extends OpenRouterError {
  constructor(message: string) {
    super(message, "AUTH_ERROR", false);
  }
}

/**
 * Rate limit error - too many requests
 * Retryable with backoff
 */
export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(message: string) {
    super(message, "RATE_LIMIT_ERROR", true);
  }
}

/**
 * Timeout error - request exceeded timeout limit
 * Retryable
 */
export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message: string) {
    super(message, "TIMEOUT_ERROR", true);
  }
}

/**
 * Network error - connection issues
 * Retryable
 */
export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR", true);
  }
}

/**
 * Service error - OpenRouter API unavailable (5xx errors)
 * Retryable
 */
export class OpenRouterServiceError extends OpenRouterError {
  constructor(message: string) {
    super(message, "SERVICE_ERROR", true);
  }
}

/**
 * Parse error - unable to parse API response
 * Non-retryable (indicates contract violation)
 */
export class OpenRouterParseError extends OpenRouterError {
  constructor(message: string) {
    super(message, "PARSE_ERROR", false);
  }
}

/**
 * Generic API error with status code
 * Retryable only for 5xx status codes
 */
export class OpenRouterApiError extends OpenRouterError {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    const retryable = statusCode !== undefined && statusCode >= 500;
    super(message, "API_ERROR", retryable);
    this.statusCode = statusCode;
  }
}
