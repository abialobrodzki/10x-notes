# Plan implementacji widoku Logowanie

## 1. Przegląd

Widok umożliwia zalogowanie użytkownika (Supabase Auth). Po sukcesie sprawdza, czy istnieją tymczasowe dane `pendingGeneratedNote` (TTL 24h) i proponuje zapis nowej notatki po przejściu do widoku chronionego.

## 2. Routing widoku

- Ścieżka: `/login` (publiczny)
- SSR: nie wymagany; CSR z walidacją formularza

## 3. Struktura komponentów

- LoginPage (kontener)
  - LoginForm
  - AlertArea (komunikaty błędów, wynik walidacji)
  - RedirectHint (link do `/register`)

## 4. Szczegóły komponentów

### LoginForm

- Opis: Formularz email/hasło.
- Główne elementy: `<form>`, `<input type="email">`, `<input type="password">`, checkbox „Pokaż hasło”, submit.
- Obsługiwane interakcje: onSubmit → Supabase Auth signIn; blokada przycisku podczas logowania.
- Obsługiwana walidacja: email w formacie, hasło niepuste.
- Typy: `{ email: string; password: string }`.
- Propsy: `{ onSubmit, isSubmitting }`.

### AlertArea

- Opis: Prezentacja błędów (role="alert").
- Elementy: lista komunikatów.
- Interakcje: brak.
- Walidacja: brak.
- Typy/Props: `{ messages?: string[] }`.

### RedirectHint

- Opis: Link do rejestracji.
- Elementy: tekst + `<a href="/register">`.
- Interakcje: klik → nawigacja.
- Walidacja: brak.
- Typy/Props: none.

## 5. Typy

- Nowe:
  - `LoginVM`: `{ email: string; password: string; isSubmitting: boolean; error?: string }`.

## 6. Zarządzanie stanem

- Lokalny stan formularza; po sukcesie: odczyt `pendingGeneratedNote` z storage i redirect (np. do `/notes` z otwartym formularzem zapisu lub do dedykowanej sekcji w szczegółach po utworzeniu).

## 7. Integracja API

- Supabase Auth (logowanie) – poza `/api/*` projektu; brak własnych endpointów.
- Po zalogowaniu: opcjonalne odświeżenie profilu z `GET /api/user/profile` w tle (dla nawigacji/awataru).

## 8. Interakcje użytkownika

- Wprowadzenie email/hasła → submit → sukces/błąd.
- Po sukcesie: redirect i opcjonalny przepływ „zapisz notatkę” (wykrycie `pendingGeneratedNote`).

## 9. Warunki i walidacja

- Email poprawny, hasło niepuste.
- Bezpieczeństwo: nie loguj treści haseł; focus management i aria-labels.

## 10. Obsługa błędów

- Niepoprawny login/hasło: komunikat w `AlertArea`.
- Problem z siecią: toast + możliwość ponowienia.

## 11. Kroki implementacji

1. Utwórz `/src/pages/login.astro` i osadź `LoginPage` (React).
2. Zaimplementuj `LoginForm` z walidacją i integracją z Supabase Auth.
3. Po sukcesie sprawdź `localStorage.pendingGeneratedNote`; jeśli istnieje, zaplanuj ścieżkę zapisu notatki.
4. Dodaj `AlertArea` i obsłuż focus na błędach.
