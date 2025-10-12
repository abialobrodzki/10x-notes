// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    // @ts-expect-error - Tailwind v4 plugin type incompatibility, remove when fixed upstream
    plugins: [tailwindcss()],
  },
  adapter: node({
    mode: "standalone",
  }),
});
