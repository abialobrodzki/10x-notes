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
