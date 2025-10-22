# Plan implementacji widoku Rejestracja

## 1. Przegląd

Widok umożliwia utworzenie konta użytkownika (Supabase Auth). Po sukcesie obowiązuje ten sam przepływ co po logowaniu: wykrycie `pendingGeneratedNote` i przejście do zapisu notatki.

## 2. Routing widoku

- Ścieżka: `/register` (publiczny)
- SSR: nie wymagany; CSR

## 3. Struktura komponentów

- RegisterPage (kontener)
  - RegisterForm
  - AlertArea (błędy/walidacja)
  - RedirectHint (link do `/login`)

## 4. Szczegóły komponentów

### RegisterForm

- Opis: Formularz rejestracji z email/hasłem (i potwierdzeniem hasła).
- Główne elementy: `<form>`, `<input type="email">`, `<input type="password">`, `<input type="password">` (confirm), submit.
- Interakcje: onSubmit → Supabase Auth signUp; blokada przycisku podczas rejestracji.
- Walidacja: email poprawny; hasło minimalna długość (np. 8); potwierdzenie hasła zgodne.
- Typy: `{ email: string; password: string; confirmPassword: string }`.
- Propsy: `{ onSubmit, isSubmitting }`.

### AlertArea

- Jak w logowaniu.

### RedirectHint

- Opis: Link do logowania.

## 5. Typy

- Nowe: `RegisterVM`: `{ email: string; password: string; confirmPassword: string; isSubmitting: boolean; error?: string }`.

## 6. Zarządzanie stanem

- Lokalny stan formularza; po sukcesie: redirect (po weryfikacji email jeśli wymagana) i wykrycie `pendingGeneratedNote`.

## 7. Integracja API

- Supabase Auth (rejestracja) – poza `/api/*`.

## 8. Interakcje użytkownika

- Wprowadzenie danych → submit → sukces/błąd; link do logowania.

## 9. Warunki i walidacja

- Email poprawny; hasło minimalna długość; confirmPassword zgodne z password.

## 10. Obsługa błędów

- Błędy rejestracji: komunikat; problemy sieciowe: toast + retry.

## 11. Kroki implementacji

1. Utwórz `/src/pages/register.astro` i osadź `RegisterPage` (React).
2. Zaimplementuj `RegisterForm` z walidacją i integracją z Supabase Auth.
3. Po sukcesie: redirect oraz wykrycie `pendingGeneratedNote`.
4. Dodaj `AlertArea` i batch focus na błędach.
