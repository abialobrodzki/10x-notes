# Diagram architektury autentykacji - 10xNotes

Ten dokument przedstawia pełną architekturę autentykacji w aplikacji 10xNotes, podzieloną na osobne diagramy dla każdego przepływu.

## Spis treści

1. [Rejestracja i weryfikacja email](#1-rejestracja-i-weryfikacja-email)
2. [Logowanie z pending note flow](#2-logowanie-z-pending-note-flow)
3. [Dostęp do chronionej strony (SSR)](#3-dostęp-do-chronionej-strony-ssr)
4. [Automatyczne odświeżanie tokenów](#4-automatyczne-odświeżanie-tokenów)
5. [API endpoint z requireAuth](#5-api-endpoint-z-requireauth)
6. [Odzyskiwanie hasła](#6-odzyskiwanie-hasła)
7. [Wylogowanie](#7-wylogowanie)
8. [Row Level Security (RLS)](#8-row-level-security-rls)
9. [Pending Note Auto-Save](#9-pending-note-auto-save)

---

## 1. Rejestracja i weryfikacja email

Przepływ tworzenia nowego konta z potwierdzeniem adresu email.

```mermaid
sequenceDiagram
    autonumber

    participant Browser as Przeglądarka
    participant Supabase as Supabase Auth
    participant Email as Email Service
    participant DB as PostgreSQL

    Note over Browser,DB: Użytkownik wypełnia formularz rejestracji

    Browser->>Browser: RegisterForm.tsx
    Note right of Browser: Walidacja:<br/>- Email format<br/>- Hasło min 8 znaków<br/>- Zgodność haseł

    Browser->>+Supabase: signUp(email, password)
    Note right of Browser: Client-side:<br/>supabaseClient.auth.signUp()

    Supabase->>Supabase: Hashowanie hasła (bcrypt)
    Supabase->>DB: INSERT INTO auth.users
    Note right of DB: email_confirmed: false<br/>created_at: now()

    par Wysłanie emaila
        Supabase->>Email: Wysłanie emaila weryfikacyjnego
        Note right of Email: Token ważny 24h<br/>Link: /login?token=xxx
    and Odpowiedź do przeglądarki
        Supabase-->>Browser: User created
        Note right of Supabase: Session NIE utworzona<br/>(wymaga weryfikacji)
    end

    deactivate Supabase

    Browser->>Browser: Wyświetlenie komunikatu
    Note right of Browser: "Sprawdź email i potwierdź adres<br/>aby się zalogować"

    Note over Browser,Email: Użytkownik otwiera email

    Email->>Browser: Kliknięcie linku weryfikacyjnego

    Browser->>+Supabase: GET /auth/confirm?token=xxx
    Note right of Browser: Automatyczne przekierowanie<br/>z linku w emailu

    Supabase->>Supabase: Weryfikacja tokenu
    Note right of Supabase: Sprawdzenie:<br/>- Ważność tokenu<br/>- Wygaśnięcie (24h)

    alt Token ważny
        Supabase->>DB: UPDATE auth.users
        Note right of DB: SET email_confirmed = true<br/>SET confirmed_at = now()

        Supabase-->>Browser: Redirect do /login
        Note right of Supabase: Status: 302 Found<br/>Location: /login

        Browser->>Browser: Wyświetlenie komunikatu
        Note right of Browser: "Email potwierdzony!<br/>Możesz się teraz zalogować"
    else Token wygasł
        Supabase-->>Browser: Error: Token expired
        Browser->>Browser: Komunikat o błędzie
        Note right of Browser: "Link wygasł.<br/>Zarejestruj się ponownie"
    end

    deactivate Supabase
```

**Kluczowe elementy:**

- `RegisterForm.tsx:87` - wywołanie `supabaseClient.auth.signUp()`
- Email confirmation wymagany przed logowaniem
- Token weryfikacyjny ważny 24h (konfigurowalny w Supabase Dashboard)
- Hasło hashowane bcrypt przed zapisem
- Session NIE tworzona automatycznie (wymaga weryfikacji)

---

## 2. Logowanie z pending note flow

Autentykacja użytkownika z obsługą wygenerowanej notatki przed rejestracją.

```mermaid
sequenceDiagram
    autonumber

    participant Browser as Przeglądarka
    participant Supabase as Supabase Auth
    participant DB as PostgreSQL
    participant Storage as SessionStorage

    Note over Browser,Storage: Użytkownik wypełnia formularz logowania

    Browser->>Browser: LoginForm.tsx
    Note right of Browser: Walidacja:<br/>- Email format<br/>- Hasło niepuste

    Browser->>+Supabase: signInWithPassword(email, password)
    Note right of Browser: Client-side:<br/>supabaseClient.auth.signInWithPassword()

    Supabase->>DB: SELECT FROM auth.users WHERE email=?
    DB-->>Supabase: User record

    Supabase->>Supabase: Weryfikacja hasła (bcrypt compare)

    alt Email niepotwierdzony
        Supabase-->>Browser: Error: Email not confirmed
        Browser->>Browser: Wyświetlenie błędu
        Note right of Browser: "Potwierdź email przed logowaniem"

    else Nieprawidłowe hasło
        Supabase-->>Browser: Error: Invalid credentials
        Browser->>Browser: Wyświetlenie błędu
        Note right of Browser: "Nieprawidłowy email lub hasło"

    else Logowanie poprawne
        Supabase->>Supabase: Generowanie JWT tokens
        Note right of Supabase: Access token (exp: 1h)<br/>Refresh token (exp: 30d)

        Supabase->>DB: INSERT INTO auth.sessions
        Note right of DB: Zapis sesji z refresh token

        Supabase-->>Browser: Session created
        Note right of Supabase: Set-Cookie:<br/>sb-access-token (HttpOnly)<br/>sb-refresh-token (HttpOnly)

        Browser->>Storage: getPendingNote()
        Note right of Browser: Sprawdzenie sessionStorage

        alt Pending note istnieje i nie wygasła
            Storage-->>Browser: { content, summary, tag, timestamp }

            Browser->>Browser: Redirect /notes?autoSave=true
            Note right of Browser: Pending note zostanie<br/>automatycznie zapisana

        else Brak pending note lub wygasła
            Browser->>Browser: Redirect /notes
            Note right of Browser: Standardowe przekierowanie<br/>do listy notatek
        end
    end

    deactivate Supabase
```

**Kluczowe elementy:**

- `LoginForm.tsx:77` - wywołanie `signInWithPassword()`
- `pending-note.utils.ts:40` - `getPendingNote()` sprawdza sessionStorage
- JWT tokens w HttpOnly cookies (ochrona XSS)
- SameSite=Lax (ochrona CSRF)
- Pending note expiry: 15 minut

---

## 3. Dostęp do chronionej strony (SSR)

Przepływ server-side rendering dla stron wymagających autentykacji.

```mermaid
sequenceDiagram
    autonumber

    participant Browser as Przeglądarka
    participant Middleware as Astro Middleware
    participant SSR as Astro SSR (notes.astro)
    participant Auth as requireAuth()
    participant Supabase as Supabase Auth
    participant Service as NotesService
    participant DB as PostgreSQL + RLS

    Browser->>+Middleware: GET /notes
    Note right of Browser: HTTP request<br/>Cookie: sb-access-token=xxx

    Middleware->>Middleware: createSupabaseServerClient()
    Note right of Middleware: src/middleware/index.ts:5<br/>Czytanie cookies z request

    Middleware->>Middleware: context.locals.supabase = client
    Note right of Middleware: Wstrzykiwanie do Astro context

    Middleware->>+SSR: next()
    Note right of Middleware: Przekazanie do notes.astro

    SSR->>+Auth: requireAuth(Astro.locals.supabase)
    Note right of SSR: src/pages/notes.astro:17<br/>Weryfikacja autentykacji

    Auth->>+Supabase: auth.getUser()
    Note right of Auth: src/lib/middleware/auth.middleware.ts:40<br/>Wysyła JWT z cookies

    Supabase->>Supabase: Weryfikacja JWT signature
    Note right of Supabase: Sprawdzenie:<br/>- Podpis (HMAC-SHA256)<br/>- Wygaśnięcie (exp claim)<br/>- Issuer (iss claim)

    alt Token ważny
        Supabase-->>Auth: User { id, email }
        Auth-->>SSR: { userId, email }

        SSR->>+Service: getNotes(userId, query)
        Note right of SSR: src/pages/notes.astro:55<br/>NotesService.getNotes()

        Service->>+DB: SELECT * FROM notes WHERE...
        Note right of DB: RLS policy automatycznie filtruje:<br/>auth.uid() = user_id OR<br/>EXISTS (tag_access...)

        DB-->>Service: Notatki użytkownika
        Service-->>SSR: NotesListDTO

        SSR->>SSR: Render HTML
        Note right of SSR: Astro component z danymi SSR

        SSR-->>Middleware: HTML page
        Middleware-->>Browser: 200 OK + HTML

    else Token wygasł lub nieprawidłowy
        Supabase-->>Auth: Error: Invalid token

        Auth->>Auth: throw Response(401)
        Note right of Auth: src/lib/middleware/auth.middleware.ts:50

        Auth-->>SSR: Response 401 Unauthorized

        SSR->>SSR: catch block
        Note right of SSR: src/pages/notes.astro:20

        SSR-->>Middleware: Astro.redirect("/login")
        Middleware-->>Browser: 302 Found<br/>Location: /login
    end

    deactivate DB
    deactivate Service
    deactivate Supabase
    deactivate Auth
    deactivate SSR
    deactivate Middleware
```

**Kluczowe elementy:**

- `src/middleware/index.ts:5` - wstrzykiwanie Supabase client
- `src/lib/middleware/auth.middleware.ts:40` - `requireAuth()`
- `src/pages/notes.astro:17` - weryfikacja przed renderowaniem
- RLS automatycznie filtruje dane po `auth.uid()`
- Server-side rendering z uwierzytelnionymi danymi

---

## 4. Automatyczne odświeżanie tokenów

Mechanizm bezproblemowego przedłużania sesji bez ponownego logowania.

```mermaid
sequenceDiagram
    autonumber

    participant Browser as Przeglądarka
    participant Middleware as Astro Middleware
    participant SSR as createServerClient
    participant Supabase as Supabase Auth
    participant DB as PostgreSQL

    Note over Browser,DB: Access token bliski wygaśnięcia (np. 55 min)

    Browser->>+Middleware: GET /notes
    Note right of Browser: Cookie:<br/>sb-access-token=xxx (exp: 5 min)<br/>sb-refresh-token=yyy (exp: 29 dni)

    Middleware->>+SSR: createSupabaseServerClient(request, cookies)
    Note right of Middleware: src/lib/supabase-server.ts:13

    SSR->>SSR: cookies.getAll()
    Note right of SSR: Odczyt cookies z HTTP headers<br/>parseCookieHeader()

    SSR->>SSR: Dekodowanie JWT (access token)
    Note right of SSR: Sprawdzenie exp claim

    alt Access token wygasł lub wygasa wkrótce
        SSR->>+Supabase: POST /auth/v1/token
        Note right of SSR: Body:<br/>grant_type=refresh_token<br/>refresh_token=yyy

        Supabase->>DB: SELECT FROM auth.refresh_tokens<br/>WHERE token=?

        alt Refresh token ważny
            DB-->>Supabase: Refresh token record

            Supabase->>Supabase: Weryfikacja refresh token
            Note right of Supabase: Sprawdzenie:<br/>- Hash tokenu<br/>- Wygaśnięcie (30 dni)<br/>- Czy nie został unieważniony

            Supabase->>Supabase: Generowanie nowego access token
            Note right of Supabase: Nowy JWT z exp: 1h

            Supabase->>DB: UPDATE auth.sessions<br/>SET refreshed_at = now()

            Supabase-->>SSR: New access token

            SSR->>SSR: cookies.setAll([newTokens])
            Note right of SSR: Set-Cookie w HTTP response:<br/>sb-access-token=zzz (nowy)

            SSR-->>Middleware: Supabase client (z nowym tokenem)

            Middleware->>Middleware: Request kontynuowany
            Note right of Middleware: Użytkownik nie zauważa odświeżenia<br/>(seamless experience)

        else Refresh token wygasł (po 30 dniach)
            DB-->>Supabase: Token not found lub expired

            Supabase-->>SSR: Error: Refresh token expired

            SSR-->>Middleware: Client bez sesji

            Middleware->>Middleware: requireAuth() zwróci błąd

            Middleware-->>Browser: Redirect /login
            Note right of Middleware: Użytkownik musi się<br/>zalogować ponownie
        end

        deactivate Supabase

    else Access token nadal ważny
        SSR-->>Middleware: Supabase client (z istniejącym tokenem)

        Middleware->>Middleware: Request kontynuowany
        Note right of Middleware: Brak potrzeby odświeżania
    end

    deactivate SSR
    deactivate Middleware
```

**Kluczowe elementy:**

- `@supabase/ssr` automatycznie wykrywa wygasające tokeny
- Refresh token używany TYLKO do generowania nowego access token
- Access token: 1h (krótkotrwały, używany do każdego requestu)
- Refresh token: 30 dni (długotrwały, przechowywany bezpiecznie w cookies)
- Proces transparentny dla użytkownika

---

## 5. API endpoint z requireAuth

Autentykacja dla API endpoints (REST).

```mermaid
sequenceDiagram
    autonumber

    participant Browser as Przeglądarka
    participant Middleware as Astro Middleware
    participant API as API Route Handler
    participant Auth as requireAuth()
    participant Supabase as Supabase Auth
    participant Service as NotesService
    participant DB as PostgreSQL + RLS

    Browser->>+Middleware: POST /api/notes
    Note right of Browser: Body: { content, tag_id, ... }<br/>Cookie: sb-access-token=xxx

    Middleware->>Middleware: createSupabaseServerClient()
    Middleware->>+API: Route handler (POST)
    Note right of Middleware: src/pages/api/notes/index.ts

    API->>API: Walidacja body (Zod)
    Note right of API: noteCreateSchema.parse(body)

    API->>+Auth: requireAuth(locals.supabase)

    Auth->>+Supabase: auth.getUser()

    alt Token ważny
        Supabase-->>Auth: User { id, email }
        Auth-->>API: { userId, email }

        API->>+Service: createNote(userId, data)

        Service->>+DB: INSERT INTO notes (user_id, content, ...)
        Note right of DB: RLS policy:<br/>user_id automatycznie = auth.uid()

        DB-->>Service: Note created (id, created_at)
        Service-->>API: NoteDTO

        API-->>Middleware: Response(201)
        Note right of API: JSON: { id, content, ... }

        Middleware-->>Browser: 201 Created

    else Token nieważny
        Supabase-->>Auth: Error: Invalid token

        Auth->>Auth: throw Response(401)

        Auth-->>API: Response 401 Unauthorized

        API-->>Middleware: Response(401)
        Note right of API: JSON: { error, message }

        Middleware-->>Browser: 401 Unauthorized

        Browser->>Browser: Obsługa błędu
        Note right of Browser: Frontend przekierowuje do /login
    end

    deactivate DB
    deactivate Service
    deactivate Supabase
    deactivate Auth
    deactivate API
    deactivate Middleware
```

**Kluczowe elementy:**

- `src/pages/api/notes/index.ts:30` - wywołanie `requireAuth()`
- Walidacja input z Zod przed przetwarzaniem
- RLS automatycznie ustawia `user_id = auth.uid()`
- Response 401 przechwytywany przez frontend
- Spójny error handling (AuthError interface)

---

## 6. Odzyskiwanie hasła

Przepływ resetowania hasła dla zapomnianych credentials.

```mermaid
sequenceDiagram
    autonumber

    participant Browser as Przeglądarka
    participant Supabase as Supabase Auth
    participant Email as Email Service
    participant DB as PostgreSQL
    participant SSR as Astro SSR

    Note over Browser,SSR: KROK 1: Żądanie resetu hasła

    Browser->>Browser: ForgotPasswordForm.tsx
    Note right of Browser: Użytkownik wpisuje email

    Browser->>+Supabase: resetPasswordForEmail(email)
    Note right of Browser: Client-side:<br/>supabaseClient.auth.resetPasswordForEmail()

    Supabase->>DB: SELECT FROM auth.users WHERE email=?
    Note right of Supabase: Nie ujawnia czy email istnieje<br/>(bezpieczeństwo)

    alt Email istnieje
        Supabase->>Supabase: Generowanie recovery token
        Note right of Supabase: Token ważny 1h

        Supabase->>DB: INSERT INTO auth.recovery_tokens

        Supabase->>Email: Wysłanie emaila z linkiem
        Note right of Email: Link: /reset-password?<br/>token=xxx&type=recovery
    end

    Supabase-->>Browser: Success (zawsze)
    Note right of Supabase: Nie ujawnia czy email istnieje

    deactivate Supabase

    Browser->>Browser: Komunikat sukcesu
    Note right of Browser: "Email wysłany! Sprawdź skrzynkę"

    Note over Browser,SSR: KROK 2: Użytkownik klika link w emailu

    Email->>Browser: Kliknięcie linku resetującego

    Browser->>+SSR: GET /reset-password?token=xxx&type=recovery
    Note right of Browser: Astro SSR waliduje parametry

    SSR->>SSR: Sprawdzenie query params
    Note right of SSR: src/pages/reset-password.astro

    alt Token i type obecne w URL
        SSR-->>Browser: Render ResetPasswordPage
        Note right of SSR: Formularz nowego hasła:<br/>- password<br/>- confirmPassword<br/>- PasswordStrengthIndicator

        Browser->>Browser: Użytkownik wypełnia formularz

        Browser->>+Supabase: updateUser({ password: newPassword })
        Note right of Browser: Token z URL automatycznie<br/>uwierzytelnia request

        Supabase->>DB: SELECT FROM auth.recovery_tokens<br/>WHERE token=?

        alt Token ważny (nie wygasł, nie użyty)
            DB-->>Supabase: Recovery token record

            Supabase->>Supabase: Hashowanie nowego hasła (bcrypt)

            Supabase->>DB: UPDATE auth.users<br/>SET encrypted_password=hash

            Supabase->>DB: DELETE FROM auth.recovery_tokens<br/>WHERE token=?
            Note right of DB: Token jednorazowy<br/>(one-time use)

            Supabase->>Supabase: Utworzenie nowej sesji
            Note right of Supabase: Generowanie JWT tokens<br/>dla automatycznego logowania

            Supabase-->>Browser: Session created
            Note right of Supabase: Set-Cookie: sb-access-token, sb-refresh-token

            Browser->>Browser: Redirect /login?reset=success
            Note right of Browser: Użytkownik automatycznie zalogowany

        else Token wygasł lub już użyty
            DB-->>Supabase: Token not found

            Supabase-->>Browser: Error: Invalid token

            Browser->>Browser: Redirect /forgot-password?error=invalid
            Note right of Browser: Komunikat: "Link wygasł.<br/>Spróbuj ponownie"
        end

        deactivate Supabase

    else Brak tokenu w URL
        SSR-->>Browser: Redirect /forgot-password?error=missing
        Note right of SSR: Parametry niepoprawne
    end

    deactivate SSR
```

**Kluczowe elementy:**

- `ForgotPasswordForm.tsx` - żądanie resetu (DO IMPLEMENTACJI)
- `ResetPasswordForm.tsx` - ustawienie nowego hasła (DO IMPLEMENTACJI)
- Recovery token ważny 1h (konfigurowalny)
- One-time use (token usuwany po użyciu)
- Automatyczne logowanie po resecie
- Brak ujawniania czy email istnieje (bezpieczeństwo)

---

## 7. Wylogowanie

Zakończenie sesji i czyszczenie tokenów.

```mermaid
sequenceDiagram
    autonumber

    participant Browser as Przeglądarka
    participant Supabase as Supabase Auth
    participant DB as PostgreSQL

    Note over Browser,DB: Użytkownik klika "Wyloguj się"

    Browser->>Browser: Navbar.tsx - handleSignOut()
    Note right of Browser: Komponent nawigacji

    Browser->>+Supabase: signOut()
    Note right of Browser: Client-side:<br/>supabaseClient.auth.signOut()

    Supabase->>DB: DELETE FROM auth.sessions<br/>WHERE refresh_token=?
    Note right of DB: Usunięcie sesji z bazy

    Supabase->>DB: DELETE FROM auth.refresh_tokens<br/>WHERE token=?
    Note right of DB: Unieważnienie refresh token

    Supabase-->>Browser: Success
    Note right of Supabase: Set-Cookie (empty):<br/>sb-access-token=; Max-Age=0<br/>sb-refresh-token=; Max-Age=0

    deactivate Supabase

    Browser->>Browser: Czyszczenie lokalnego stanu
    Note right of Browser: React state reset:<br/>- user = null<br/>- session = null

    Browser->>Browser: Redirect do /
    Note right of Browser: Strona główna (anonimowa)

    Note over Browser,DB: Sesja zakończona - brak dostępu do chronionych zasobów
```

**Kluczowe elementy:**

- `Navbar.tsx` - button onClick wywołuje `signOut()`
- Cookies czyszczone przez `Set-Cookie: Max-Age=0`
- Sesja usuwana z bazy danych
- Refresh token unieważniany
- Redirect do strony głównej

---

## 8. Row Level Security (RLS)

Kontrola dostępu na poziomie bazy danych.

```mermaid
sequenceDiagram
    autonumber

    participant Browser as Przeglądarka
    participant API as API Route
    participant Supabase as Supabase Auth
    participant DB as PostgreSQL + RLS

    Note over Browser,DB: Scenariusz 1: Właściciel notatki

    Browser->>+API: GET /api/notes/123
    Note right of Browser: Cookie: sb-access-token=xxx<br/>(user_id = user-A)

    API->>API: requireAuth() → userId = user-A

    API->>+DB: SELECT * FROM notes WHERE id=123
    Note right of API: SQL query bez WHERE user_id

    DB->>DB: RLS Policy execution
    Note right of DB: CREATE POLICY notes_owner<br/>USING (auth.uid() = user_id)

    DB->>DB: Sprawdzenie: auth.uid() = user-A
    Note right of DB: auth.uid() ekstraktuje user_id z JWT

    alt user_id notatki = user-A (właściciel)
        DB-->>API: Note 123 zwrócona
        API-->>Browser: 200 OK + JSON

    else user_id notatki ≠ user-A
        DB->>DB: Sprawdzenie tag_access policy
        Note right of DB: CREATE POLICY notes_recipient<br/>USING (EXISTS tag_access...)

        DB->>DB: SELECT FROM tag_access<br/>WHERE recipient_id = user-A

        alt user-A jest odbiorcą (tag_access)
            DB-->>API: Note 123 zwrócona (tylko odczyt)
            API-->>Browser: 200 OK + JSON
        else Brak uprawnień
            DB-->>API: Pusty wynik (0 rows)
            API-->>Browser: 404 Not Found
            Note right of API: Bezpieczeństwo: nie ujawniamy<br/>czy notatka istnieje
        end
    end

    deactivate DB
    deactivate API

    Note over Browser,DB: Scenariusz 2: INSERT z RLS

    Browser->>+API: POST /api/notes
    Note right of Browser: Body: { content, tag_id }<br/>Cookie: sb-access-token=xxx (user_id = user-B)

    API->>API: requireAuth() → userId = user-B

    API->>+DB: INSERT INTO notes (content, tag_id, user_id)
    Note right of API: user_id MUSI być = auth.uid()

    DB->>DB: RLS Policy for INSERT
    Note right of DB: CREATE POLICY notes_insert<br/>WITH CHECK (auth.uid() = user_id)

    alt user_id w INSERT = user-B (auth.uid())
        DB->>DB: INSERT wykonany
        DB-->>API: Note created (id, created_at)
        API-->>Browser: 201 Created

    else user_id w INSERT ≠ user-B (próba privilege escalation)
        DB-->>API: Error: Permission denied
        Note right of DB: RLS blokuje INSERT
        API-->>Browser: 403 Forbidden
        Note right of API: Niemożliwe zapisanie notatki<br/>jako inny użytkownik
    end

    deactivate DB
    deactivate API
```

**Kluczowe elementy:**

- RLS policies w `supabase/migrations/20251029000002_complete_rls_rebuild.sql`
- `auth.uid()` automatycznie ekstraktuje user_id z JWT
- Filtrowanie na poziomie bazy (nie da się ominąć)
- Owner policy: pełen dostęp (SELECT, UPDATE, DELETE)
- Recipient policy: tylko odczyt (SELECT through tag_access)
- Ochrona przed privilege escalation

---

## 9. Pending Note Auto-Save

Unikalny feature 10xNotes - seamless onboarding experience.

```mermaid
sequenceDiagram
    autonumber

    participant Browser as Przeglądarka
    participant AI as OpenRouter API
    participant Storage as SessionStorage
    participant Supabase as Supabase Auth
    participant API as API Route
    participant DB as PostgreSQL

    Note over Browser,DB: FAZA 1: Generowanie notatki (anonimowo)

    Browser->>Browser: LandingPage.tsx - użytkownik wkleja tekst

    Browser->>+AI: POST /api/ai/generate
    Note right of Browser: optionalAuth (nie wymaga logowania)

    AI->>AI: OpenRouter LLM processing
    AI-->>-Browser: Summary + status + tag

    Browser->>+Storage: setPendingNote(generatedData)
    Note right of Browser: src/lib/utils/pending-note.utils.ts:15<br/>Zapis do sessionStorage

    Storage-->>-Browser: Saved
    Note right of Storage: Key: pending-note<br/>Value: { content, summary, tag, timestamp }

    Browser->>Browser: Wyświetlenie SavePromptBanner
    Note right of Browser: "Zaloguj się, aby zapisać notatkę"

    Note over Browser,DB: FAZA 2: Rejestracja/Logowanie

    Browser->>Browser: Klik "Zarejestruj się" lub "Zaloguj się"

    Browser->>+Supabase: signUp() lub signInWithPassword()
    Supabase-->>-Browser: Session + JWT w cookies

    Browser->>+Storage: getPendingNote()
    Note right of Browser: Sprawdzenie sessionStorage

    Storage-->>-Browser: Pending note data
    Note right of Storage: Sprawdzenie timestamp:<br/>czy nie wygasła (15 min)

    alt Pending note istnieje i nie wygasła
        Browser->>Browser: Redirect /notes?autoSave=true
        Note right of Browser: Query param: autoSave=true

        Note over Browser,DB: FAZA 3: Automatyczny zapis

        Browser->>+API: GET /notes?autoSave=true
        API->>API: requireAuth() → userId
        API-->>-Browser: NotesListPage rendered (SSR)

        Browser->>Browser: useEffect wykrywa autoSave=true
        Note right of Browser: NotesListPage.tsx:useEffect

        Browser->>+API: POST /api/notes
        Note right of Browser: Body: pending note data<br/>Cookie: sb-access-token=xxx

        API->>API: requireAuth() → userId

        API->>+DB: INSERT INTO notes<br/>(user_id, content, summary, ...)
        Note right of DB: user_id = auth.uid() z JWT<br/>(RLS policy)

        DB-->>-API: Note created
        API-->>-Browser: 201 Created

        Browser->>+Storage: clearPendingNote()
        Note right of Browser: Usunięcie z sessionStorage

        Storage-->>-Browser: Cleared

        Browser->>Browser: Wyświetlenie toast sukcesu
        Note right of Browser: "Notatka zapisana!"

    else Pending note wygasła (> 15 min)
        Browser->>Browser: Redirect /notes (bez autoSave)
        Note right of Browser: Pending note ignorowana
    end
```

**Kluczowe elementy:**

- `src/lib/utils/pending-note.utils.ts` - funkcje do zarządzania pending note
- `sessionStorage` przechowuje dane lokalnie (nie wysyłane do serwera)
- Expiry 15 minut zapobiega stale data
- `autoSave=true` query param uruchamia automatyczny zapis
- Seamless UX - użytkownik nie traci wygenerowanej notatki
- Backend wymaga valid JWT (RLS protection)

---

## Architektura autentykacji - Podsumowanie

### Stack technologiczny

```
┌─────────────────────────────────────────────────────┐
│ FRONTEND (Browser)                                  │
├─────────────────────────────────────────────────────┤
│ • React 19 (Interactive components)                 │
│ • Astro 5 (SSR + Static pages)                      │
│ • @supabase/ssr (Browser client)                    │
│ • SessionStorage (Pending note)                     │
└────────────────┬────────────────────────────────────┘
                 │ HTTP + Cookies (JWT tokens)
                 ▼
┌─────────────────────────────────────────────────────┐
│ MIDDLEWARE (Astro)                                  │
├─────────────────────────────────────────────────────┤
│ • createSupabaseServerClient()                      │
│ • Cookie management (getAll, setAll)                │
│ • Context injection (locals.supabase)               │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ BACKEND (Astro SSR + API)                           │
├─────────────────────────────────────────────────────┤
│ • requireAuth() / optionalAuth()                    │
│ • Service layer (NotesService, TagsService, etc.)   │
│ • Zod validation                                    │
└────────────────┬────────────────────────────────────┘
                 │ JWT verification
                 ▼
┌─────────────────────────────────────────────────────┐
│ AUTHENTICATION (Supabase Auth)                      │
├─────────────────────────────────────────────────────┤
│ • JWT tokens (access 1h, refresh 30d)               │
│ • Email verification                                │
│ • Password hashing (bcrypt)                         │
│ • Session management                                │
└────────────────┬────────────────────────────────────┘
                 │ auth.uid()
                 ▼
┌─────────────────────────────────────────────────────┐
│ DATABASE (PostgreSQL + RLS)                         │
├─────────────────────────────────────────────────────┤
│ • Row Level Security policies                       │
│ • auth.uid() extraction from JWT                    │
│ • Automatic filtering (owner/recipient)             │
└─────────────────────────────────────────────────────┘
```

### Kluczowe aspekty bezpieczeństwa

#### 1. JWT Tokens

- **Access Token**: Krótkotrwały (1h), używany do każdego requestu
- **Refresh Token**: Długotrwały (30 dni), służy tylko do odnowienia
- **HttpOnly Cookies**: JavaScript nie ma dostępu (ochrona XSS)
- **SameSite=Lax**: Ochrona przed CSRF
- **Secure flag**: W produkcji tylko przez HTTPS

#### 2. Row Level Security (RLS)

```sql
-- Przykładowa policy (owner)
CREATE POLICY "notes_owner_policy" ON notes
  FOR ALL USING (auth.uid() = user_id);

-- Policy dla odbiorców (tag_access)
CREATE POLICY "notes_recipient_policy" ON notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tag_access
      WHERE tag_id = notes.tag_id
        AND recipient_id = auth.uid()
    )
  );
```

**Zalety:**

- Kontrola dostępu na poziomie bazy danych
- Niemożliwe ominięcie (nawet przez SQL injection)
- `auth.uid()` automatycznie ekstraktuje user_id z JWT
- Ochrona przed privilege escalation

#### 3. Email Verification

- Token weryfikacyjny ważny 24h
- One-time use (token staje się nieważny po użyciu)
- Wymagane przed logowaniem
- Zapobiega spam accounts

#### 4. Password Reset

- Recovery token ważny 1h (short-lived)
- One-time use (token usuwany po użyciu)
- Brak ujawniania czy email istnieje (bezpieczeństwo)
- Automatyczne logowanie po resecie

#### 5. Middleware Protection

- Server-side validation (`requireAuth`)
- Automatyczne redirect niezalogowanych użytkowników
- Token refresh przed wygaśnięciem
- Context injection dla spójnego API

### Cykl życia sesji

```
┌────────────────┐
│ 1. LOGIN       │ → JWT tokens w HttpOnly cookies
│                │   (access: 1h, refresh: 30d)
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ 2. REQUEST     │ → Middleware wstrzykuje Supabase client
│                │   z cookies
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ 3. VALIDATION  │ → requireAuth sprawdza access token
│                │   (getUser)
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ 4. AUTO-REFRESH│ → Przed wygaśnięciem: użyj refresh token
│                │   (seamless, transparent)
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ 5. EXPIRY      │ → Po 30 dniach: wymagane ponowne logowanie
│                │   (refresh token wygasł)
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ 6. LOGOUT      │ → Cookies czyszczone, sesja zakończona
└────────────────┘
```

### Implementacja w kodzie

| Komponent          | Lokalizacja                             | Odpowiedzialność                   |
| ------------------ | --------------------------------------- | ---------------------------------- |
| **Client-side**    |
| Supabase client    | `src/db/supabase.client.ts`             | Browser client dla auth operations |
| Login form         | `src/components/LoginForm.tsx:77`       | signInWithPassword()               |
| Register form      | `src/components/RegisterForm.tsx:87`    | signUp()                           |
| Navbar logout      | `src/components/layout/Navbar.tsx`      | signOut()                          |
| Pending note utils | `src/lib/utils/pending-note.utils.ts`   | sessionStorage management          |
| **Server-side**    |
| Middleware         | `src/middleware/index.ts:5`             | Supabase client injection          |
| Server client      | `src/lib/supabase-server.ts:13`         | Cookie-based client                |
| Auth middleware    | `src/lib/middleware/auth.middleware.ts` | requireAuth(), optionalAuth()      |
| Protected pages    | `src/pages/notes.astro:17`              | requireAuth call                   |
| API routes         | `src/pages/api/**/*.ts`                 | requireAuth in handlers            |
| **Database**       |
| RLS policies       | `supabase/migrations/*.sql`             | Row Level Security                 |
| Auth schema        | Supabase managed                        | auth.users, auth.sessions          |

---

## Pending Note Flow - Szczegółowy opis

Unikalny feature 10xNotes zapewniający seamless onboarding:

### Problem

Użytkownik generuje notatkę (test drive), ale nie ma konta. Jak zachować wygenerowane dane bez wymogu logowania?

### Rozwiązanie

1. **Generowanie** (anonimowo) → zapis do `sessionStorage`
2. **Zachęta** → `SavePromptBanner` z linkami do rejestracji/logowania
3. **Autentykacja** → użytkownik zakłada konto lub loguje się
4. **Auto-redirect** → `/notes?autoSave=true`
5. **Auto-save** → `NotesListPage` automatycznie wysyła POST /api/notes
6. **Cleanup** → pending note usuwana z `sessionStorage`

### Bezpieczeństwo

- Dane tylko lokalnie (nie wysyłane do serwera bez autentykacji)
- Expiry 15 minut (zapobiega stale data)
- Backend wymaga valid JWT (RLS protection)
- User nie może zapisać notatki jako inny użytkownik (RLS blokuje)

### Kod

```typescript
// Zapis pending note
setPendingNote({
  content: string,
  summary: string,
  goalStatus: string,
  tag: string,
  timestamp: Date.now(),
});

// Odczyt po logowaniu
const pending = getPendingNote();
if (pending && !isExpired(pending.timestamp, 15)) {
  redirect("/notes?autoSave=true");
}

// Auto-save w NotesListPage
useEffect(() => {
  if (searchParams.get("autoSave") === "true" && pendingNote) {
    await createNote(pendingNote);
    clearPendingNote();
  }
}, []);
```

---

## Podsumowanie końcowe

Aplikacja 10xNotes implementuje nowoczesną, bezpieczną autentykację opartą na:

✅ **JWT tokens** w HttpOnly cookies (ochrona XSS)
✅ **Supabase Auth** jako backend autentykacji
✅ **Row Level Security** dla kontroli dostępu na poziomie bazy
✅ **Automatyczne odświeżanie tokenów** dla seamless UX
✅ **Email verification** dla bezpieczeństwa
✅ **Password reset** z short-lived tokens
✅ **Pending note flow** dla lepszego onboardingu

Wszystkie przepływy są zabezpieczone przed typowymi atakami (XSS, CSRF, privilege escalation, SQL injection) i zgodne z best practices dla JWT-based authentication.

### Status implementacji

| Feature             | Status              | Lokalizacja                                  |
| ------------------- | ------------------- | -------------------------------------------- |
| Rejestracja         | ✅ Zaimplementowane | `RegisterForm.tsx`, `register.astro`         |
| Weryfikacja email   | ✅ Zaimplementowane | Supabase Auth                                |
| Logowanie           | ✅ Zaimplementowane | `LoginForm.tsx`, `login.astro`               |
| Pending note flow   | ✅ Zaimplementowane | `pending-note.utils.ts`, `NotesListPage.tsx` |
| Protected pages     | ✅ Zaimplementowane | `notes.astro`, `settings.astro`              |
| API auth            | ✅ Zaimplementowane | `requireAuth()` w route handlers             |
| Token refresh       | ✅ Zaimplementowane | `@supabase/ssr` automatic                    |
| Wylogowanie         | ✅ Zaimplementowane | `Navbar.tsx`                                 |
| RLS policies        | ✅ Zaimplementowane | `supabase/migrations/*.sql`                  |
| **Forgot password** | ❌ Do implementacji | Spec: `auth-spec.md`                         |
| **Reset password**  | ❌ Do implementacji | Spec: `auth-spec.md`                         |

### Kolejne kroki (Forgot Password - zgodnie z auth-spec.md)

Aby ukończyć moduł autentykacji zgodnie z US-001 z PRD:

1. Utworzyć `src/pages/forgot-password.astro`
2. Utworzyć `src/components/ForgotPasswordPage.tsx`
3. Utworzyć `src/components/ForgotPasswordForm.tsx`
4. Utworzyć `src/pages/reset-password.astro` (z walidacją tokenu)
5. Utworzyć `src/components/ResetPasswordPage.tsx`
6. Utworzyć `src/components/ResetPasswordForm.tsx`
7. Dodać link "Nie pamiętasz hasła?" w `LoginPage.tsx`
8. Skonfigurować Reset Password Email template w Supabase Dashboard

Szacowany czas: **4-6 godzin** (Faza 1 z auth-spec.md)
