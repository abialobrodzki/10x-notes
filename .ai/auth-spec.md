# Specyfikacja Techniczna: Moduł Autentykacji 10xNotes

## 1. STAN OBECNY

### ✅ Zaimplementowane funkcjonalności

**Strony Astro:**

- `src/pages/login.astro` - logowanie
- `src/pages/register.astro` - rejestracja
- `src/pages/notes.astro`, `src/pages/settings.astro` - chronione, wymagają auth

**Komponenty React:**

- `src/components/LoginPage.tsx` + `LoginForm.tsx` - formularz logowania
- `src/components/RegisterPage.tsx` + `RegisterForm.tsx` - formularz rejestracji
- `src/components/layout/Navbar.tsx` - nawigacja z rozróżnieniem auth/non-auth
- `src/components/PasswordStrengthIndicator.tsx` - wskaźnik siły hasła

**Backend:**

- `src/middleware/index.ts` - wstrzykiwanie Supabase client
- `src/lib/middleware/auth.middleware.ts` - `requireAuth()`, `optionalAuth()`
- `src/lib/validators/auth.validators.ts` - walidatory email i hasła
- `src/db/supabase.client.ts` - client-side Supabase
- `src/lib/supabase-server.ts` - server-side Supabase

**Przepływy:**

- Rejestracja z weryfikacją email
- Logowanie z pending note flow
- Wylogowanie z czyszczeniem sesji
- Automatyczne odnawianie tokenów JWT
- Ochrona zasobów przez RLS policies

### ❌ Brakująca funkcjonalność

**Odzyskiwanie zapomnianego hasła** - wymagane przez US-001 (PRD sekcja 5)

---

## 2. CO WYMAGA IMPLEMENTACJI

### 2.1 Nowe pliki (6 plików)

#### **Strony Astro (2 pliki)**

**1. `src/pages/forgot-password.astro`**

```
Funkcjonalność:
- Renderuje `ForgotPasswordPage` (client:load)
- Layout standardowy z Navbar
- Dostępna dla wszystkich użytkowników
```

**2. `src/pages/reset-password.astro`**

```
Funkcjonalność:
- export const prerender = false (dynamiczna walidacja)
- Walidacja parametrów URL: token, type=recovery (server-side)
- Przekierowanie do /forgot-password?error=invalid_token jeśli brak tokenu
- Renderuje ResetPasswordPage z props {token}
```

---

#### **Komponenty React (4 pliki)**

**3. `src/components/ForgotPasswordPage.tsx`**

```
Odpowiedzialność:
- Kontener dla formularza resetowania
- Stan: errors (string[]), success (boolean)
- Warunkowe renderowanie: ForgotPasswordForm LUB komunikat sukcesu
- Link powrotu do /login
- Stylowanie: GlassCard + gradient background (jak LoginPage)
```

**4. `src/components/ForgotPasswordForm.tsx`**

```
Props: { onError, onSuccess }

Pola:
- email (Input)

Walidacja:
- validateEmail() z auth.validators.ts

Submit:
- supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
- onSuccess(true) po udanym wysłaniu

Komunikaty:
- "Adres email jest wymagany"
- "Podaj poprawny adres email"
```

**5. `src/components/ResetPasswordPage.tsx`**

```
Props: { token: string }

Odpowiedzialność:
- Kontener dla formularza nowego hasła
- Stan: errors (string[]), success (boolean)
- Warunkowe renderowanie: ResetPasswordForm LUB komunikat sukcesu
- Po sukcesie: przycisk "Przejdź do logowania" → /login
- Stylowanie: GlassCard + gradient background
```

**6. `src/components/ResetPasswordForm.tsx`**

```
Props: { token, onError, onSuccess }

Pola:
- password (Input)
- confirmPassword (Input)
- showPassword (Checkbox)
- PasswordStrengthIndicator (komponent)

Walidacja:
- validatePasswordRegister() - minimum 8 znaków
- validatePasswordConfirm() - zgodność haseł

Submit:
- supabaseClient.auth.updateUser({ password })
- onSuccess(true) po udanej zmianie
- Token z URL automatycznie loguje użytkownika

Komunikaty:
- "Hasło musi mieć co najmniej 8 znaków"
- "Hasła muszą być identyczne"
```

---

### 2.2 Modyfikacje istniejących plików

#### **`src/components/LoginPage.tsx`** (drobne zmiany)

**Dodać:**

1. Link "Nie pamiętasz hasła?" nad przyciskiem logowania:

   ```
   <a href="/forgot-password" className="text-sm text-glass-text hover-link">
     Nie pamiętasz hasła?
   </a>
   ```

2. Obsługa parametru `?reset=success`:
   ```
   const urlParams = new URLSearchParams(window.location.search);
   if (urlParams.get('reset') === 'success') {
     // Wyświetl komunikat sukcesu w AlertArea
     setErrors(["Hasło zostało zmienione pomyślnie! Możesz się teraz zalogować."]);
   }
   ```

---

#### **`src/components/AlertArea.tsx`** (opcjonalne ulepszenie)

**Dodać warianty dla różnych typów komunikatów:**

```
Props: { messages, variant?: "success" | "error" | "info" }

Kolory:
- success: zielony (bg-green-500/10, text-green-400)
- error: czerwony (bg-red-500/10, text-red-400) - domyślny
- info: niebieski (bg-blue-500/10, text-blue-400)
```

---

### 2.3 Konfiguracja Supabase Dashboard

**Auth → Email Templates:**

**1. Confirm Signup Email**

```
Subject: Potwierdź swój adres email - 10xNotes
Button: "Potwierdź email" → {{ .ConfirmationURL }}
HTML: Custom template z brandingiem (gradient, logo)
```

**2. Reset Password Email** (nowy template)

```
Subject: Resetowanie hasła - 10xNotes
Button: "Resetuj hasło" → {{ .ConfirmationURL }}
Info: "Link jest ważny przez 1 godzinę"
HTML: Custom template z brandingiem
```

**Auth → URL Configuration:**

```
Redirect URLs:
- http://localhost:3000/** (dev)
- https://10xnotes.example.com/** (prod)
```

---

## 3. PRZEPŁYW ODZYSKIWANIA HASŁA (nowy)

### 3.1 Diagram przepływu

```
┌─────────────────────────────────────────────────────────────────┐
│ Użytkownik na /login → klik "Nie pamiętasz hasła?"             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ /forgot-password                                                │
│ - ForgotPasswordForm                                            │
│ - Pole: email                                                   │
│ - Submit → resetPasswordForEmail()                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Komunikat: "Email z linkiem resetującym został wysłany"        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Email → Link resetujący                                         │
│ URL: /reset-password?token=xxx&type=recovery                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ (klik)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ reset-password.astro (SSR)                                      │
│ - Walidacja token i type server-side                           │
│ - Jeśli brak → redirect /forgot-password?error=invalid_token   │
└────────────────────────────┬────────────────────────────────────┘
                             │ (token valid)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ ResetPasswordForm                                               │
│ - Pola: password, confirmPassword                              │
│ - PasswordStrengthIndicator                                     │
│ - Submit → updateUser({ password })                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Komunikat: "Hasło zmienione!"                                   │
│ Przycisk: "Przejdź do logowania"                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ /login?reset=success                                            │
│ - Wyświetlenie komunikatu sukcesu                              │
│ - Użytkownik może się zalogować nowym hasłem                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Kluczowe API calls

**Krok 1 - Inicjacja resetu:**

```
supabaseClient.auth.resetPasswordForEmail(email, { redirectTo })
→ Supabase wysyła email z tokenem
→ Token ważny 15min-24h (konfigurowalny w Supabase Dashboard)
```

**Krok 2 - Ustawienie nowego hasła:**

```
supabaseClient.auth.updateUser({ password })
→ Token z URL automatycznie uwierzytelnia użytkownika
→ Hasło aktualizowane w auth.users
→ Token staje się nieważny
→ Użytkownik pozostaje zalogowany (nowa sesja)
```

---

## 4. DODATKOWE ULEPSZENIA UX (opcjonalne - Faza 2)

### 4.1 Redirect handling po logowaniu

**Problem:**
Gdy użytkownik niezalogowany próbuje wejść na `/notes`, jest przekierowany do `/login`, ale po zalogowaniu trafia na `/notes` zamiast oryginalnej strony.

**Rozwiązanie:**

**Modyfikacja: `src/pages/notes.astro`, `src/pages/settings.astro`**

```typescript
catch (_error) {
  const currentPath = Astro.url.pathname + Astro.url.search;
  return Astro.redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
}
```

**Modyfikacja: `src/components/LoginForm.tsx`**

```typescript
// Po udanym logowaniu:
const urlParams = new URLSearchParams(window.location.search);
const redirect = urlParams.get("redirect") || "/notes";
window.location.href = redirect;
```

---

## 5. ROADMAP IMPLEMENTACJI

### Faza 1: Odzyskiwanie hasła (PRIORYTET - realizacja US-001 PRD)

**Zadania:**

1. Utworzenie `src/pages/forgot-password.astro`
2. Utworzenie `src/components/ForgotPasswordPage.tsx`
3. Utworzenie `src/components/ForgotPasswordForm.tsx`
4. Utworzenie `src/pages/reset-password.astro` z walidacją tokenu
5. Utworzenie `src/components/ResetPasswordPage.tsx`
6. Utworzenie `src/components/ResetPasswordForm.tsx`
7. Modyfikacja `src/components/LoginPage.tsx` - link "Nie pamiętasz hasła?"
8. Konfiguracja Reset Password Email template w Supabase Dashboard

**Szacowany czas:** 4-6 godzin

---

### Faza 2: Ulepszenia UX (OPCJONALNIE)

**Zadania:**

1. Redirect handling - parametr `?redirect` w loginie
2. Komunikat sukcesu - parametr `?reset=success` po resecie hasła
3. Rozszerzenie `AlertArea` o warianty (success/error/info)
4. Dedykowana strona `/email-confirmed` po weryfikacji email
5. Toast notifications dla operacji auth

**Szacowany czas:** 2-3 godziny

---

## 6. ODNIESIENIA DO ISTNIEJĄCEGO KODU

### Komponenty do reużycia

**Stylowanie:**

- `GlassCard` z `src/components/ui/composed/GlassCard.tsx`
- Gradient classes: `bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to`
- Layout: `src/layouts/Layout.astro`

**Walidatory (wykorzystać istniejące):**

- `validateEmail()` w `src/lib/validators/auth.validators.ts`
- `validatePasswordRegister()` w `src/lib/validators/auth.validators.ts`
- `validatePasswordConfirm()` w `src/lib/validators/auth.validators.ts`

**Komponenty UI:**

- `PasswordStrengthIndicator` w `src/components/PasswordStrengthIndicator.tsx`
- `AlertArea` w `src/components/AlertArea.tsx`
- Shadcn/ui: `Button`, `Input`, `Label` z `src/components/ui/`

**Supabase client:**

- `supabaseClient` z `src/db/supabase.client.ts` (do użycia w React components)

---

## 7. BEZPIECZEŃSTWO

### Model autentykacji (istniejący)

**Supabase Auth:**

- JWT-based authentication
- HttpOnly cookies (ochrona XSS)
- SameSite=Lax (ochrona CSRF)
- Access token (1h) + Refresh token (30 dni)
- Automatyczne odnowienie przez `@supabase/ssr`

**Row Level Security (RLS):**

- Polityki bazują na `auth.uid()` z JWT
- Automatyczna kontrola dostępu na poziomie bazy
- Owner policies: `auth.uid() = user_id`

**Reset hasła - dodatkowe zabezpieczenia:**

- Token resetujący krótkotrwały (15min-24h)
- Token jednorazowy (invalidates po użyciu)
- Email confirmation wymaga dostępu do skrzynki
- Brak ujawniania, czy email istnieje w systemie

---

## 8. PODSUMOWANIE

### Stan implementacji

**✅ Gotowe (zgodnie z US-001 PRD):**

- Rejestracja, logowanie, wylogowanie
- Weryfikacja email
- Ochrona zasobów (SSR + RLS)
- Walidacja formularzy
- Pending note flow

**❌ Wymaga dodania (US-001 PRD - odzyskiwanie hasła):**

- 6 nowych plików (2 Astro + 4 React)
- Link w LoginPage
- Email template w Supabase
- Opcjonalnie: redirect handling, warianty AlertArea

### Szacowany czas

**Faza 1 (krytyczna):** 4-6 godzin
**Faza 2 (opcjonalna):** 2-3 godziny
**Razem:** 6-9 godzin

---

## KONIEC SPECYFIKACJI
