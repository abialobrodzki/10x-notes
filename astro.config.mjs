// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

/**
 * @module astro.config.mjs
 * @description This is the main configuration file for the Astro project.
 * It defines how the application is built, integrated with other frameworks,
 * and deployed.
 * @see https://docs.astro.build/en/reference/configuration-reference/
 */
export default defineConfig({
  /**
   * @property {string} output
   * @description Specifies the output target for the Astro build.
   * "server" mode is used for Server-Side Rendering (SSR), which is required
   * for dynamic API routes and authentication flows.
   * @default "server"
   * @see https://docs.astro.build/en/guides/server-side-rendering/
   */
  output: "server",

  /**
   * @property {Array<object>} integrations
   * @description A list of Astro integrations to use in the project.
   * - `react()`: Enables React components to be used within Astro.
   * - `sitemap()`: Automatically generates a sitemap for the project.
   * @see https://docs.astro.build/en/guides/integrations-guide/
   */
  integrations: [react(), sitemap()],

  /**
   * @property {object} server
   * @description Configuration for the Astro development server.
   * @property {number} server.port - The port on which the development server will run.
   * @default 3000
   */
  server: {
    port: 3000,
  },

  /**
   * @property {object} vite
   * @description Configuration for Vite, which Astro uses as its build tool.
   * @property {Array<object>} vite.plugins - Vite plugins to extend its functionality.
   *   - `tailwindcss()`: Integrates Tailwind CSS v4 with Vite, enabling utility-first styling.
   *     The `@ts-expect-error` is a temporary workaround for type incompatibility with Tailwind v4 plugin.
   * @property {object} vite.resolve - Module resolution options.
   * @property {object} vite.resolve.alias - Aliases for module imports.
   *   - `react-dom/server`: During production builds (`import.meta.env.PROD`), this alias
   *     swaps `react-dom/server` with `react-dom/server.edge` for better compatibility
   *     and performance in edge environments like Cloudflare Workers.
   * @see https://vitejs.dev/config/
   */
  vite: {
    // @ts-expect-error - Tailwind v4 plugin type incompatibility, remove when fixed upstream
    plugins: [tailwindcss()],
    resolve: {
      alias: import.meta.env.PROD
        ? {
            "react-dom/server": "react-dom/server.edge",
          }
        : undefined,
    },
  },

  /**
   * @property {object} adapter
   * @description The Astro adapter used for deploying the project to a specific platform.
   * - `cloudflare()`: Configures the project for deployment on Cloudflare Pages,
   *   enabling it to run as a Cloudflare Worker. This is crucial for the serverless
   *   architecture of the application.
   * @see https://docs.astro.build/en/guides/deploy/cloudflare/
   */
  adapter: cloudflare(),
});
