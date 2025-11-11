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
  server: { port: 3000 },
  env: {
    schema: {
      // Supabase - Public (client-side accessible)
      PUBLIC_SUPABASE_URL: envField.string({
        context: "client",
        access: "public",
        default: "https://placeholder.supabase.co", // Placeholder for build time
      }),
      PUBLIC_SUPABASE_KEY: envField.string({
        context: "client",
        access: "public",
        default: "placeholder-anon-key", // Placeholder for build time
      }),
      // Supabase - Server-only secrets
      SUPABASE_SERVICE_ROLE_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true, // Optional - only needed for E2E tests
      }),
      // OpenRouter API
      OPENROUTER_API_KEY: envField.string({
        context: "server",
        access: "secret",
        default: "placeholder-openrouter-key", // Placeholder for build time
      }),
    },
  },
  vite: {
    // @ts-expect-error - Tailwind v4 plugin type incompatibility, remove when fixed upstream
    plugins: [tailwindcss()],
    resolve: {
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19.
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled.
      // Only in production - local dev uses standard Node.js build
      alias: import.meta.env.PROD
        ? {
            "react-dom/server": "react-dom/server.edge",
          }
        : undefined,
    },
  },
  adapter: cloudflare({
    imageService: "compile",
    platformProxy: {
      enabled: true,
    },
  }),
});
