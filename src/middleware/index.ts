import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "../lib/supabase-server";
import type { APIContext, MiddlewareNext } from "astro";

/**
 * Public paths that don't require authentication
 * Includes public access endpoints and public API routes
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
 * Auth-only paths (pages for unauthenticated users only)
 * If user is authenticated, they will be redirected to dashboard
 */
const AUTH_ONLY_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Check if the given path is public (doesn't require auth)
 * Exported for testing purposes
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Check if the given path is auth-only (for unauthenticated users only)
 * Exported for testing purposes
 */
export function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_PATHS.some((path) => pathname === path);
}

/**
 * Core middleware logic (Astro-agnostic for testability)
 * Exported for testing purposes
 */
export async function middlewareHandler(context: APIContext, next: MiddlewareNext): Promise<Response> {
  // Create server-side Supabase client with cookies support
  context.locals.supabase = createSupabaseServerClient(context.request, context.cookies);

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

// Astro middleware wrapper
export const onRequest = defineMiddleware(middlewareHandler);
