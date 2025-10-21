import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL environment variable. " + "Please add it to .env file (see .env.example)");
}

if (!supabaseAnonKey) {
  throw new Error("Missing SUPABASE_KEY environment variable. " + "Please add it to .env file (see .env.example)");
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
