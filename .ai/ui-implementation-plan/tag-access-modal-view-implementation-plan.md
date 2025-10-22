# Plan implementacji widoku Zarządzanie dostępem do etykiety (Modal)

## 1. Przegląd

Modal pozwala właścicielowi etykiety zarządzać odbiorcami z dostępem read-only do wszystkich notatek oznaczonych tą etykietą: przegląd listy, dodawanie po emailu, usuwanie dostępu.

## 2. Routing widoku

- Kontekst: otwierany z `/notes` lub `/notes/{id}` (brak własnej ścieżki; modal)
- Dla linkowalności opcjonalnie hash `#tag-access` lub stan nawigacji

## 3. Struktura komponentów

- TagAccessModal (dialog z focus trap)
  - RecipientsList
    - RecipientItem (email + granted_at + RemoveButton)
  - AddRecipientForm (EmailInput + AddButton)
  - Footer: Close/Cancel
  - ToastHost

## 4. Szczegóły komponentów

### TagAccessModal

- Opis: Kontener logiki modala, fetchuje listę i obsługuje mutacje.
- Elementy: tytuł, lista odbiorców, formularz dodawania, stopka.
- Interakcje: otwórz/zamknij, grant/revoke, focus management, ESC do zamknięcia.
- Walidacja: `is_owner` wymagane; formularz email – poprawny format i zarejestrowany użytkownik.
- Typy: `TagAccessListDTO`, `GrantTagAccessCommand`.
- Propsy: `{ tagId: UUID, isOwner: boolean, onClose }`.

### RecipientsList

- Opis: Lista aktualnych odbiorców.
- Elementy: wiersze `RecipientItem`.
- Interakcje: brak (akcje w itemach).
- Walidacja: brak.
- Typy: `TagAccessListDTO`.
- Propsy: `{ recipients, onRemove(recipient_id) }`.

### RecipientItem

- Opis: Prezentacja odbiorcy + przycisk usunięcia dostępu.
- Elementy: email, data nadania, RemoveButton.
- Interakcje: onClick Remove → DELETE.
- Walidacja: brak.
- Typy: `TagAccessRecipientDTO`.
- Propsy: `{ recipient, onRemove }`.

### AddRecipientForm

- Opis: Dodawanie nowego odbiorcy na podstawie emaila.
- Elementy: `<input type="email">`, AddButton.
- Interakcje: onSubmit → POST; disabled podczas requestu.
- Walidacja: poprawny email; obsługa 400 („user not found/ unconfirmed”), 409 (duplikat dostępu).
- Typy: `GrantTagAccessCommand`.
- Propsy: `{ onAdd(email), isAdding }`.

## 5. Typy

- Z `src/types.ts`: `TagAccessListDTO`, `TagAccessRecipientDTO`, `GrantTagAccessCommand`, `UUID`.
- Nowe: `TagAccessVM`: `{ recipients?: TagAccessRecipientDTO[]; loading: boolean; adding: boolean; removing: Record<string, boolean>; error?: string }`.

## 6. Zarządzanie stanem

- SWR: `useSWR<TagAccessListDTO>("/api/tags/{id}/access")`.
- Mutacje: optimistic removal (usunąć lokalnie, rollback przy błędzie), po add – revalidate listy.
- Klawiatura: ESC zamyka modal; focus na pierwszym interaktywnym elemencie.

## 7. Integracja API

- GET `/api/tags/{id}/access` → `TagAccessListDTO`.
- POST `/api/tags/{id}/access` (body: `GrantTagAccessCommand`) → `TagAccessGrantedDTO`.
- DELETE `/api/tags/{id}/access/{recipient_id}` → 204.

## 8. Interakcje użytkownika

- Dodanie odbiorcy → POST → toast „Dodano dostęp” → revalidate.
- Usunięcie odbiorcy → DELETE (optimistic) → toast „Usunięto dostęp”.
- Zamknięcie modala → `onClose`.

## 9. Warunki i walidacja

- Tylko właściciel może zarządzać dostępem; dla recipienta modal niedostępny/disabled.
- Email musi należeć do istniejącego, potwierdzonego użytkownika.

## 10. Obsługa błędów

- 400: „Użytkownik nie istnieje” / „Email niepotwierdzony”.
- 401/403: brak uprawnień → pokaż komunikat i zamknij modal.
- 404: etykieta nie istnieje → komunikat.
- 409: dostęp już istnieje.

## 11. Kroki implementacji

1. Dodaj `TagAccessModal` (shadcn/ui Dialog) i integruj z `NotesListPage`/`NoteDetailPage`.
2. Zaimplementuj `RecipientsList` i `AddRecipientForm` z walidacją email.
3. Dodaj integrację z API (GET/POST/DELETE) i optimistic removal.
4. Dodaj toasty i obsługę focus/ESC.
