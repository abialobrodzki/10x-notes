/**
 * Email validation regex pattern
 * Matches: user@example.com, test.email+tag@domain.co.uk
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email address
 * @param email - Email to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateEmail(email: string): string[] {
  const errors: string[] = [];

  if (!email.trim()) {
    errors.push("Adres email jest wymagany");
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push("Podaj poprawny adres email");
  }

  return errors;
}

/**
 * Validate password for login
 * @param password - Password to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validatePasswordLogin(password: string): string[] {
  const errors: string[] = [];

  if (!password) {
    errors.push("Hasło jest wymagane");
  }

  return errors;
}

/**
 * Validate password for registration (stricter requirements)
 * @param password - Password to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validatePasswordRegister(password: string): string[] {
  const errors: string[] = [];

  if (!password) {
    errors.push("Hasło jest wymagane");
  } else if (password.length < 8) {
    errors.push("Hasło musi mieć co najmniej 8 znaków");
  }

  return errors;
}

/**
 * Validate password confirmation matches
 * @param password - Original password
 * @param confirmPassword - Password confirmation
 * @returns Array of validation errors (empty if valid)
 */
export function validatePasswordConfirm(password: string, confirmPassword: string): string[] {
  const errors: string[] = [];

  if (!confirmPassword) {
    errors.push("Potwierdzenie hasła jest wymagane");
  } else if (password !== confirmPassword) {
    errors.push("Hasła muszą być identyczne");
  }

  return errors;
}
