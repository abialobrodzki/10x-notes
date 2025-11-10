import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { requireE2EUserCredentials } from "./env.helpers";
import type { TestUser } from "../types/test-user.types";

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in environment variables.");
}

const resolvedSupabaseUrl: string = supabaseUrl;
const resolvedSupabaseAnonKey: string = supabaseAnonKey;

// Create Supabase clients for anon and optional service role operations
const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey);
const supabaseServiceRole = supabaseServiceRoleKey
  ? createClient(resolvedSupabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Creates a new, unique test user in Supabase for test isolation.
 * @returns A promise that resolves to the new user's details.
 */
export async function createTestUser(): Promise<TestUser> {
  const uniqueId = uuidv4();
  const email = `test-user-${uniqueId}@example.com`;
  const password = `password-${uniqueId}`;

  if (supabaseServiceRole) {
    return createUserWithServiceRole(email, password);
  }

  return createUserWithAnonSignup(email, password);
}

/**
 * Deletes a test user and all their associated data from the database.
 * This function logs in as the user to be deleted to gain the necessary permissions.
 * @param user - The user object containing credentials for the user to be deleted.
 * @returns A promise that resolves when the user has been deleted.
 */
export async function deleteTestUser(user: TestUser): Promise<void> {
  // Log in as the user to get a valid session with 'authenticated' role
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (loginError) {
    // If user not found, they might have been deleted already.
    if (loginError.message.includes("Invalid login credentials")) {
      console.warn(`User ${user.email} not found for deletion, likely already cleaned up.`);
      return;
    }
    throw new Error(`Failed to log in as user for deletion: ${loginError.message}`);
  }

  if (!loginData.session) {
    throw new Error("Failed to establish a session for the user to be deleted.");
  }

  // Create a new client instance authenticated as the user to be deleted
  const userSupabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${loginData.session.access_token}`,
      },
    },
  });

  // Call the RPC function to delete the user's own account
  const { error: rpcError } = await userSupabase.rpc("delete_user_account", {
    p_user_id: user.id,
    p_confirmation_email: user.email,
  });

  if (rpcError) {
    // Ignore error if user is already gone
    if (rpcError.message.includes("USER_NOT_FOUND")) {
      console.warn(`User ${user.email} was not found during RPC deletion call.`);
      return;
    }
    throw new Error(`Failed to delete user via RPC: ${rpcError.message}`);
  }
}

/**
 * Returns a fallback test user defined via .env.test (E2E_USERNAME / E2E_PASSWORD).
 * Used when Supabase signup hits rate limits so that tests can still execute.
 */
export async function getFallbackEnvTestUser(): Promise<TestUser> {
  const credentials = requireE2EUserCredentials();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    throw new Error(`Failed to sign in fallback E2E user from .env.test: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Fallback E2E user did not return a user object after sign-in.");
  }

  return {
    id: data.user.id,
    email: credentials.email,
    password: credentials.password,
    token: data.session?.access_token ?? "",
  };
}

async function createUserWithAnonSignup(email: string, password: string): Promise<TestUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("User data not returned after sign-up.");
  }

  return {
    id: data.user.id,
    email,
    password,
    token: data.session?.access_token ?? "",
  };
}

async function createUserWithServiceRole(email: string, password: string): Promise<TestUser> {
  if (!supabaseServiceRole) {
    throw new Error("Supabase service role client not initialized.");
  }

  const { data, error } = await supabaseServiceRole.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create test user via service role: ${error.message}`);
  }

  const userId = data.user?.id;

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    throw new Error(`Service role user created, but login failed: ${loginError.message}`);
  }

  if (!userId && !loginData.user) {
    throw new Error("Service role user login did not return user information.");
  }

  return {
    id: userId ?? loginData.user?.id ?? "",
    email,
    password,
    token: loginData.session?.access_token ?? "",
  };
}
