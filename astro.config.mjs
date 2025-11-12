// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    ssr: {
      noExternal: ["@supabase/ssr"],
    },
    // @ts-expect-error - Tailwind v4 plugin type incompatibility, remove when fixed upstream
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
});
