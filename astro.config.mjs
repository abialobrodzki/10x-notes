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
  env: {
    schema: {
      // Public variables, prefixed with PUBLIC_
      PUBLIC_SUPABASE_URL: envField.string({
        context: "client", // Available on both server and client
        access: "public",
      }),
      PUBLIC_SUPABASE_KEY: envField.string({
        context: "client",
        access: "public",
      }),
      // Secret variables, only available on the server
      OPENROUTER_API_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      SUPABASE_URL: envField.string({
        context: "server",
        access: "secret",
      }),
      SUPABASE_ANON_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
    },
  },
  vite: {
    // @ts-expect-error - Tailwind v4 plugin type incompatibility, remove when fixed upstream
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
});
