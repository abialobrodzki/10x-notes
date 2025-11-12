/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      user?: {
        id: string;
        email: string;
      };
      runtime?: {
        env: {
          SUPABASE_URL?: string;
          SUPABASE_ANON_KEY?: string;
          OPENROUTER_API_KEY?: string;
        };
      };
    }
  }
}

// This interface defines the shape of `import.meta.env`
// and is used by `astro:env/client` to provide type-safe access to env variables.
interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
