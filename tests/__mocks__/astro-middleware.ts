/**
 * Mock for astro:middleware module
 * Used in unit tests to avoid importing Astro-specific modules
 */

import type { APIContext, MiddlewareNext } from "astro";

export function defineMiddleware(handler: (context: APIContext, next: MiddlewareNext) => Promise<Response>) {
  return handler;
}
