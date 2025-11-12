// @ts-check
import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: {
    port: 3000,
  },
  // Define the schema for environment variables for type safety and validation
  // This configuration is based on a working project with a similar stack.
  env: {
    schema: {
      // These are defined as server-side secrets.
      // The Astro build process will ensure they are available in the server context.
      SUPABASE_URL: envField.string({
        context: "server",
        access: "secret",
      }),
      SUPABASE_ANON_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      OPENROUTER_API_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      // These PUBLIC variables are for client-side code.
      PUBLIC_SUPABASE_URL: envField.string({
        context: "client",
        access: "public",
      }),
      PUBLIC_SUPABASE_KEY: envField.string({
        context: "client",
        access: "public",
      }),
    },
  },
  vite: {
    // @ts-expect-error - Tailwind v4 plugin type incompatibility, remove when fixed upstream
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
});
