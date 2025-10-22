# Plan implementacji widoku Szczegóły notatki

## 1. Przegląd

Widok służy do przeglądu i edycji pojedynczej notatki. Umożliwia właścicielowi edycję podsumowania, statusu celów, daty spotkania i etykiety, a także zarządzanie publicznym linkiem. Odbiorca (recipient) ma widok tylko do odczytu. Widok respektuje role i bezpieczeństwo (auth, RLS) oraz zapewnia przejrzyste stany ładowania/błędów.

## 2. Routing widoku

- Ścieżka: `/notes/{id}` (chroniona, wymaga zalogowania)
- SSR: wstępny fetch danych do SEO i szybkości, później hydracja i SWR do aktualizacji

## 3. Struktura komponentów

- NoteDetailPage (kontener strony)
  - NoteDetailSkeleton (stan ładowania)
  - NoteHeader
    - Breadcrumbs (opcjonalnie)
    - TagBadge + Owner/RecipientBadge + PublicLinkBadge
  - NoteContentGrid
    - OriginalContentSection (collapsible: Pokaż/Ukryj oryginał)
    - SummaryEditorPanel
      - SummaryEditor (inline)
      - GoalStatusRadio
      - MeetingDatePicker
      - TagCombobox (z opcją „Utwórz nową: {name}”)
  - PublicLinkSection
    - PublicLinkToggle
    - PublicLinkUrl (pokazanie/copy-to-clipboard)
    - RotateTokenButton
  - TagAccessButton (otwiera TagAccessModal z zarządzaniem dostępem do etykiety)
  - ToastHost (powiadomienia)

## 4. Szczegóły komponentów

### NoteDetailPage

- Opis: Kontener logiki widoku, łączy dane, stan i renderuje podkomponenty.
- Główne elementy: wrapper layoutu, sekcje header/content/linki.
- Obsługiwane interakcje: inicjalny fetch, invalidacja cache, zarządzanie optimistic updates.
- Walidacja: brzegowa (przekazywana do dzieci), kontrola roli `is_owner`.
- Typy: NoteDetailDTO, NoteDTO, PublicLinkDTO, TagWithStatsDTO.
- Propsy: none (pobiera `{id}` z routera/params).

### NoteDetailSkeleton

- Opis: Szkielet ładowania dla całego widoku.
- Elementy: placeholdery (karty, linie tekstu, pola formularzy).
- Interakcje: brak.
- Walidacja: brak.
- Typy/Props: none.

### NoteHeader

- Opis: Pasek nagłówka z meta-informacjami.
- Elementy: breadcrumbs, TagBadge, Owner/RecipientBadge, PublicLinkBadge.
- Interakcje: klik w TagBadge filtruje listę w `/notes?tag_id=...`.
- Walidacja: brak.
- Typy: Pick<NoteDetailDTO, "tag" | "is_owner" | "public_link">.
- Propsy: `{ tag, is_owner, public_link }`.

### OriginalContentSection

- Opis: Sekcja z oryginalnym tekstem notatki (read-only) z możliwością zwijania.
- Elementy: nagłówek + przycisk Pokaż/Ukryj, kontener z treścią (truncate 6–8 linii + „Pokaż więcej”).
- Interakcje: toggle expanded.
- Walidacja: XSS-safe render (tekst plain), brak HTML.
- Typy: `original_content: NoteDetailDTO["original_content"]`.
- Propsy: `{ original_content }`.

### SummaryEditor

- Opis: Edycja podsumowania z przyciskami Zapisz/Anuluj (inline editing pattern).
- Elementy: textarea + licznik znaków + akcje.
- Interakcje: onChange, onSave (PATCH), onCancel (rollback do ostatniej wartości z serwera), disable dla recipienta.
- Walidacja (zgodnie z API):
  - length ≤ 2000 znaków (jeśli podane); może być null.
  - Blokada zapisu i komunikat przy przekroczeniu.
- Typy: `summary_text: NoteDetailDTO["summary_text"]`, `UpdateNoteCommand`.
- Propsy: `{ value, isOwner, onSave, onCancel, isSaving }`.

### GoalStatusRadio

- Opis: Radio group 3-stanowa: achieved / not_achieved / undefined.
- Elementy: radio z ikonami/kolorami (zielony ✓, czerwony ✗, szary ?), etykiety dostępnościowe.
- Interakcje: onChange → PATCH (optimistic + rollback przy błędzie), disable dla recipienta.
- Walidacja: wartość ∈ {"achieved","not_achieved","undefined"} | null.
- Typy: `GoalStatus`, `UpdateNoteCommand`.
- Propsy: `{ value, isOwner, onChange, isSaving }`.

### MeetingDatePicker

- Opis: Wybór daty spotkania.
- Elementy: shadcn/ui date picker (format wyświetlania pl-PL; model YYYY-MM-DD).
- Interakcje: onChange → PATCH (optimistic), disable dla recipienta.
- Walidacja: poprawny format daty `YYYY-MM-DD`.
- Typy: `NoteDetailDTO["meeting_date"]`, `UpdateNoteCommand`.
- Propsy: `{ value, isOwner, onChange, isSaving }`.

### TagCombobox

- Opis: Wybór etykiety albo utworzenie nowej „Utwórz nową: {name}”.
- Elementy: combobox z listą tagów (GET /api/tags), opcja tworzenia (POST /api/tags), następnie PATCH notatki z nowym `tag_id`.
- Interakcje: select existing → PATCH; create new → POST tag → PATCH note; disable dla recipienta.
- Walidacja: nazwa tagu niepusta; konflikt 409 → komunikat i wybór istniejącej etykiety.
- Typy: TagWithStatsDTO, CreateTagCommand, UpdateNoteCommand.
- Propsy: `{ currentTag, isOwner, onSelectTag(tagId), onCreateTag(name), isSaving }`.

### PublicLinkSection

- Opis: Zarządzanie linkiem publicznym do notatki.
- Elementy: toggle on/off, wyświetlenie URL (token), copy-to-clipboard, rotate token.
- Interakcje:
  - Włącz: `POST /api/notes/{id}/public-link` (idempotent, zwraca token/URL).
  - Wyłącz: `PATCH /api/notes/{id}/public-link` `{ is_enabled:false }`.
  - Rotacja: `POST /api/notes/{id}/public-link/rotate` (ostrzegawcze modal dialog).
  - Copy: kopiuje pełny URL do schowka.
- Walidacja: tylko właściciel; token nieujawniany dla recipienta; brak dla anon.
- Typy: PublicLinkDTO, UpdatePublicLinkCommand.
- Propsy: `{ publicLink, isOwner, onEnable, onDisable, onRotate, onCopy, loadingStates }`.

### TagAccessButton (+ TagAccessModal)

- Opis: Skrót do zarządzania dostępem dla etykiety bieżącej notatki.
- Elementy: przycisk w sekcji detali; modal (GET/POST/DELETE /api/tags/{id}/access).
- Interakcje: otwarcie modala, dodanie/uszunięcie odbiorcy, zamknięcie modala.
- Walidacja: tylko właściciel; poprawny email, obsługa błędów 400/409.
- Typy: TagAccessListDTO, GrantTagAccessCommand.
- Propsy (Button): `{ tagId, isOwner }`; (Modal): standard zgodny z globalnym komponentem.

## 5. Typy

- Reużywane (z `src/types.ts`):
  - `NoteDetailDTO`, `NoteDTO`, `UpdateNoteCommand`, `PublicLinkDTO`, `UpdatePublicLinkCommand`, `TagWithStatsDTO`, `CreateTagCommand`, `GoalStatus`.
- Nowe ViewModel/stan lokalny:
  - `NoteDetailVM`:
    - `data: NoteDetailDTO`
    - `ui: { isLoading: boolean; isOwner: boolean; expandedOriginal: boolean; saving: { summary:boolean; goal:boolean; date:boolean; tag:boolean; link:boolean; rotate:boolean; }; validation: { summaryTooLong: boolean } }`
  - `TagOption`:
    - `{ id: string; name: string; note_count?: number }` (na potrzeby comboboxa)
  - `PublicLinkState`:
    - `{ isEnabled: boolean; url?: string; token?: string }`

## 6. Zarządzanie stanem

- SWR:
  - `useSWR<NoteDetailDTO>("/api/notes/{id}")` – dane główne notatki.
  - `useSWR<TagsListDTO>("/api/tags?include_shared=false")` – lista etykiet do comboboxa (może być `useSWRImmutable`).
- Optimistic updates z `mutate` (rollback przy błędzie).
- Lokalne stany per-akcja: `isSavingSummary`, `isSavingGoal`, ...; `expandedOriginal`.
- Auth/role: przez kontekst lub z pola `is_owner` z API.

## 7. Integracja API

- GET `/api/notes/{id}` → `NoteDetailDTO` (pola: oryginał, summary, goal_status, meeting_date, tag, is_owner, public_link | null).
- PATCH `/api/notes/{id}` (body: `UpdateNoteCommand`) → `NoteDTO` (aktualny stan bez `is_owner` i `public_link`).
- POST `/api/notes/{id}/public-link` → `PublicLinkDTO { token, url, is_enabled, created_at?, is_new? }`.
- PATCH `/api/notes/{id}/public-link` (body: `{ is_enabled: boolean }`) → `PublicLinkDTO`.
- POST `/api/notes/{id}/public-link/rotate` → `PublicLinkDTO` (nowy token, `updated_at`).
- GET `/api/tags` → `TagsListDTO` (komponent TagCombobox).
- POST `/api/tags` (body: `CreateTagCommand`) → `TagDTO` → następnie PATCH notatki `tag_id`.

## 8. Interakcje użytkownika

- Zmiana podsumowania → przycisk Zapisz (PATCH) lub Anuluj (rollback).
- Zmiana statusu celu → natychmiastowy PATCH (optimistic update).
- Zmiana daty → natychmiastowy PATCH (optimistic update).
- Zmiana etykiety → select istniejącej (PATCH) lub „Utwórz nową” (POST tag → PATCH note).
- Zarządzanie public linkiem → toggle on/off, kopiowanie URL, rotacja tokenu z potwierdzeniem.
- Otwórz/Zamknij oryginał treści.

## 9. Warunki i walidacja

- Rola: `is_owner=false` → wszystkie pola edycyjne disabled/hidden; brak sekcji public link.
- `summary_text`: ≤ 2000 znaków; null dozwolone; komunikat błędu i blokada zapisu >2000.
- `goal_status`: enum/nullable – walidacja wyboru.
- `meeting_date`: format `YYYY-MM-DD` (datepicker zapewnia poprawność).
- `tag`:
  - wybór istniejącego – zawsze poprawny;
  - tworzenie nowego – nazwa niepusta; konflikt 409 → pokaż sugerowany istniejący tag.
- Public link: tylko właściciel; rotacja z ostrzeżeniem (zrywa wcześniejsze linki).

## 10. Obsługa błędów

- 401/403: redirect do `/login` + toast „Zaloguj się, aby kontynuować”.
- 404: karta błędu w widoku (notatka nie istnieje).
- 400 walidacja (summary za długie, zła data): inline error + blokada zapisu.
- 409 (tag conflict): komunikat + wybór istniejącego.
- 429: toast z countdown (z `Retry-After`), blokada przycisków do czasu odliczenia.
- 5xx/Network: rollback optimistic, toast „Coś poszło nie tak”, możliwość ponowienia.

## 11. Kroki implementacji

1. Utwórz stronę `/src/pages/notes/[id].astro` (layout, SSR fetch notatki).
2. Dodaj komponent kontenerowy `NoteDetailPage` (React) z `useSWR` dla `/api/notes/{id}` + skeleton.
3. Zaimplementuj `OriginalContentSection` z expand/collapse i truncation.
4. Zaimplementuj `SummaryEditor` z licznikiem znaków, walidacją ≤2000, akcjami Zapisz/Anuluj (PATCH + optimistic).
5. Dodaj `GoalStatusRadio` (onChange → PATCH + optimistic).
6. Dodaj `MeetingDatePicker` (onChange → PATCH + optimistic) z formatem pl-PL.
7. Dodaj `TagCombobox`: `GET /api/tags`, wybór istniejącego (PATCH), „Utwórz nową” (POST → PATCH) z obsługą 409.
8. Zaimplementuj `PublicLinkSection`: toggle on/off (POST/PATCH), rotate (POST rotate z potwierdzeniem), copy URL.
9. Dodaj `TagAccessButton` otwierający globalny `TagAccessModal` (jeśli dostępny; inaczej placeholder/disabled).
10. Dodaj ToastHost i standardowe powiadomienia dla wszystkich mutacji (w tym 429 countdown).
11. Pokryj stany ról (`is_owner`) – schowanie/disabled odpowiednich akcji.
12. Testy manualne: scenariusze właściciel/recipient, błędy walidacji, 404, rotacja tokenu.
13. Refine UX: focus management, aria-atributy, klawisz ESC zamyka modale, outline dla focus.
