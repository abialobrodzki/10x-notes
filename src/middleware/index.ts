/**
 * @module middleware/index
 * @description This module contains the core authentication and authorization middleware for the application.
 * It intercepts all incoming requests and handles routing based on the user's authentication status.
 *
 * @depends on `astro:middleware`
 * @depends on `../lib/supabase-server`
 */

import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "../lib/supabase-server";
import type { APIContext, MiddlewareNext } from "astro";

/**
 * @constant {string[]} PUBLIC_PATHS
 * @description An array of paths that do not require authentication.
 * This includes public pages, API routes, and assets.
 */
const PUBLIC_PATHS = [
  // Landing page (public AI generation)
  "/",
  // Public access pages (shared notes via public links)
  "/share",
  // Public API endpoints
  "/api/auth", // Auth endpoints (login, register, logout)
  "/api/share", // Shared notes
  "/api/ai", // AI generation
];

/**
 * @constant {string[]} AUTH_ONLY_PATHS
 * @description An array of paths that are only accessible to unauthenticated users.
 * If an authenticated user tries to access these paths, they will be redirected to the dashboard.
 */
const AUTH_ONLY_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Checks if a given path is a public path.
 * Public paths are accessible to all users, regardless of their authentication status.
 *
 * @param {string} pathname - The path to check.
 * @returns {boolean} `true` if the path is public, `false` otherwise.
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Checks if a given path is an auth-only path.
 * Auth-only paths are only accessible to unauthenticated users.
 *
 * @param {string} pathname - The path to check.
 * @returns {boolean} `true` if the path is auth-only, `false` otherwise.
 */
export function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_PATHS.some((path) => pathname === path);
}

/**
 * The core middleware handler for the application.
 * This function is responsible for:
 * - Creating a Supabase server client.
 * - Getting the authenticated user.
 * - Redirecting users based on their authentication status and the path they are trying to access.
 * - Clearing invalid authentication cookies.
 *
 * @param {APIContext} context - The Astro API context.
 * @param {MiddlewareNext} next - The next middleware in the chain.
 * @returns {Promise<Response>} A promise that resolves to a `Response` object.
 * @see https://docs.astro.build/en/guides/middleware/
 */
export async function middlewareHandler(context: APIContext, next: MiddlewareNext): Promise<Response> {
  // Create server-side Supabase client with cookies support
  // For Cloudflare Pages, pass runtime.env; for local dev, it falls back to astro:env
  const env = context.locals.runtime?.env
    ? {
        SUPABASE_URL: context.locals.runtime.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: context.locals.runtime.env.SUPABASE_ANON_KEY,
      }
    : undefined;
  context.locals.supabase = createSupabaseServerClient(context.request, context.cookies, env);

  // Get authenticated user
  const {
    data: { user },
  } = await context.locals.supabase.auth.getUser();

  // Debug logging for auth issues
  if (context.url.pathname !== "/") {
    // eslint-disable-next-line no-console
    console.log(`[AUTH] Path: ${context.url.pathname}, User: ${user?.email || "none"}`);
  }

  // Store user in locals if authenticated
  if (user && user.email) {
    context.locals.user = {
      id: user.id,
      email: user.email,
    };

    // Redirect authenticated users away from auth-only pages (login, register, reset password)
    if (isAuthOnlyPath(context.url.pathname)) {
      // eslint-disable-next-line no-console
      console.log(`[AUTH] Redirecting authenticated user away from auth page: ${context.url.pathname}`);
      const redirectResponse = context.redirect("/");
      // Prevent caching of redirect to avoid showing auth pages via browser back button
      redirectResponse.headers.set("Cache-Control", "no-store, must-revalidate, no-cache, private");
      redirectResponse.headers.set("Pragma", "no-cache");
      return redirectResponse;
    }

    return next();
  }

  // User is not authenticated
  // Clear invalid auth cookies if they exist (safety mechanism for corrupted sessions)
  const response = new Response();
  const cookieHeader = context.request.headers.get("cookie") || "";
  if (cookieHeader.includes("sb-") || cookieHeader.includes("auth")) {
    // Invalidate all Supabase auth cookies
    response.headers.append(
      "Set-Cookie",
      "sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; Secure; SameSite=Lax"
    );
    response.headers.append(
      "Set-Cookie",
      "sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; Secure; SameSite=Lax"
    );
  }

  // Allow access to public paths and auth-only pages
  if (isPublicPath(context.url.pathname) || isAuthOnlyPath(context.url.pathname)) {
    const pageResponse = await next();

    // Prevent caching of auth pages to avoid showing them via browser back button
    if (isAuthOnlyPath(context.url.pathname)) {
      pageResponse.headers.set("Cache-Control", "no-store, must-revalidate, no-cache, private");
      pageResponse.headers.set("Pragma", "no-cache");
    }

    return pageResponse;
  }

  // Redirect to login for protected routes
  // eslint-disable-next-line no-console
  console.log(`[AUTH] Redirecting unauthenticated user to login from: ${context.url.pathname}`);
  return context.redirect("/login");
}

/**
 * @constant {MiddlewareResponseHandler} onRequest
 * @description The Astro middleware wrapper for the `middlewareHandler` function.
 * This is the entry point for the middleware.
 * @see https://docs.astro.build/en/guides/middleware/
 */
export const onRequest = defineMiddleware(middlewareHandler);
