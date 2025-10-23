import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "../lib/supabase-server";

export const onRequest = defineMiddleware((context, next) => {
  // Create server-side Supabase client with cookies support
  context.locals.supabase = createSupabaseServerClient(context.request, context.cookies);
  return next();
});
