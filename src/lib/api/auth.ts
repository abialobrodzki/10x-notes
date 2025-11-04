import type { LoginInput, RegisterInput, ResetPasswordInput, ForgotPasswordInput } from "@/lib/validators/auth.schemas";

/**
 * API client for authentication endpoints
 * Handles login, registration, password reset, and password recovery
 */

/**
 * Login with email and password
 * @param data - Login form data (email, password)
 * @returns User session data or throws error
 */
export async function login(data: LoginInput) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: data.email.trim(),
      password: data.password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    // Create structured error for TanStack Query to handle
    const error = new Error(errorData.message || "Authentication failed");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any).status = response.status;
    throw error;
  }
  return response.json();
}

/**
 * Register a new user with email and password
 * @param data - Registration form data (email, password)
 * @returns User session data or confirmation message
 */
export async function register(data: RegisterInput) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: data.email.trim(),
      password: data.password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error = new Error(errorData.message || "Registration failed");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any).status = response.status;
    throw error;
  }
  return response.json();
}

/**
 * Reset user password with new password
 * @param _data - Reset password form data (password, confirmPassword)
 * @returns Success response
 */
export async function resetPassword(_data: ResetPasswordInput) {
  // Import supabaseClient directly in the mutation hook
  // This function signature is here for consistency
  // The actual implementation will be in the mutation hook
  throw new Error("resetPassword should be called through the mutation hook");
}

/**
 * Request password reset email
 * @param data - Forgot password form data (email)
 * @returns Success response or throws error
 */
export async function forgotPassword(data: ForgotPasswordInput) {
  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: data.email.trim(),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error = new Error(errorData.message || "Password reset request failed");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any).status = response.status;
    throw error;
  }
  return response.json();
}
