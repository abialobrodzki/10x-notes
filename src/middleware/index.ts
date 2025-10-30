import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "../lib/supabase-server";

/**
 * Public paths that don't require authentication
 * Includes auth pages, public access endpoints, and public API routes
 */
const PUBLIC_PATHS = [
  // Auth pages
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  // Public access pages (shared notes via public links)
  "/share",
  // Public API endpoints
  "/api/share",
  "/api/ai",
];

/**
 * Check if the given path is public (doesn't require auth)
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Create server-side Supabase client with cookies support
  context.locals.supabase = createSupabaseServerClient(context.request, context.cookies);

  // Skip auth check for public paths
  if (isPublicPath(context.url.pathname)) {
    return next();
  }

  // Get authenticated user
  const {
    data: { user },
  } = await context.locals.supabase.auth.getUser();

  // Store user in locals if authenticated
  if (user && user.email) {
    context.locals.user = {
      id: user.id,
      email: user.email,
    };
  } else {
    // Redirect to login for protected routes
    return context.redirect("/login");
  }

  return next();
});
