# Plan implementacji widoku Lista notatek

## 1. Przegląd

Widok prezentuje listę notatek użytkownika z filtrowaniem (tag, data, status celów), wyszukiwaniem frazy (client-side), sortowaniem i paginacją (desktop) lub infinite scroll (mobile). Sidebar zawiera listę etykiet wraz z liczbą notatek i akcjami zarządzania.

## 2. Routing widoku

- Ścieżka: `/notes` (chroniony)
- Query params: `tag_id`, `goal_status`, `date_from`, `date_to`, `page`, `limit`, `include_shared`, `sort_by`, `order`
- SSR: pobranie initial data zgodnie z URL, następnie SWR dla interakcji

## 3. Struktura komponentów

- NotesListPage (kontener)
  - AppShell
    - TagSidebar (lista etykiet + akcje CRUD + „Zarządzaj dostępem”)
    - ContentArea
      - FiltersPanel (DateRangePicker, GoalStatusMultiSelect, SortSelect)
      - SearchInput (debounce 300ms + highlight)
      - NoteList (virtualized >100)
        - NoteListItem (klik prowadzi do `/notes/{id}`)
      - Pagination (desktop) / InfiniteLoader (mobile)
  - ToastHost

## 4. Szczegóły komponentów

### TagSidebar

- Opis: Nawigacja po etykietach; pokazuje `note_count`, oznaczenie współdzielonych etykiet.
- Główne elementy: lista tagów, przycisk „+” (create), menu kontekstowe (rename/delete), „Zarządzaj dostępem”.
- Interakcje: select tag → aktualizacja URL (`tag_id`), create (POST), rename (PATCH), delete (DELETE), manage access (modal).
- Walidacja: create/rename – nazwa niepusta; 409 konflikt nazw; delete – ostrzeżenie gdy powiązane notatki.
- Typy: `TagsListDTO`, `TagWithStatsDTO`, `CreateTagCommand`, `UpdateTagCommand`.
- Propsy: `{ selectedTagId, onSelect, onCreate, onRename, onDelete, onManageAccess }`.

### FiltersPanel

- Opis: Zarządzanie filtrami i sortowaniem.
- Elementy: DateRangePicker, GoalStatusMultiSelect, SortSelect (`meeting_date|created_at|updated_at` + `asc|desc`), Reset.
- Interakcje: onChange → aktualizacja URL + refetch listy.
- Walidacja: daty w formacie `YYYY-MM-DD`; status z enumu; limit ≤100.
- Typy: `NotesListQuery`.
- Propsy: `{ value, onChange }`.

### SearchInput

- Opis: Wyszukiwanie frazy po stronie klienta.
- Elementy: `<input type="search">`, ikona, przycisk clear.
- Interakcje: onChange (debounce 300ms), highlight fraz w `NoteListItem`.
- Walidacja: brak specjalnej (case-insensitive).
- Typy: `{ term: string }`.
- Propsy: `{ value, onChange }`.

### NoteList

- Opis: Lista notatek z wirtualizacją >100.
- Elementy: wiersze/karty `NoteListItem`.
- Interakcje: klik na item → `/notes/{id}`.
- Walidacja: brak.
- Typy: `NotesListDTO`, `NoteListItemDTO`.
- Propsy: `{ items, isLoading, onEndReached? }`.

### Pagination / InfiniteLoader

- Opis: Kontrolki paginacji (desktop) lub ładowanie kolejnych stron (mobile z sentinel observer).
- Elementy: numery stron, „Dalej/Wstecz”; sentinel + spinner.
- Interakcje: zmiana strony → aktualizacja URL `page` + refetch; infinite scroll → fetch next page.
- Walidacja: `limit` ≤ 100; `page` ≥ 1.
- Typy: `PaginationDTO`.
- Propsy: `{ pagination, onPageChange }` / `{ loading, hasMore, onLoadMore }`.

### NoteListItem

- Opis: Pojedynczy element listy: fragment streszczenia, data, status celu, etykieta, wskaźniki AI/public/owner.
- Elementy: tytuł/preview tekstu (truncate), badge statusu i tagu, ikony.
- Interakcje: klik prowadzi do szczegółów; na hover (desktop) link/ikonka.
- Walidacja: brak.
- Typy: `NoteListItemDTO`.
- Propsy: `{ item, onClick }`.

## 5. Typy

- Z `src/types.ts`: `NotesListDTO`, `NotesListQuery`, `NoteListItemDTO`, `TagsListDTO`, `TagWithStatsDTO`, `CreateTagCommand`, `UpdateTagCommand`.
- Nowe:
  - `NotesListVM`: `{ filters: NotesListQuery; searchTerm: string; isMobile: boolean; isLoading: boolean }`.

## 6. Zarządzanie stanem

- SSR: pobierz `/api/tags` i `/api/notes` wg URL.
- SWR: `useSWR<NotesListDTO>("/api/notes?...")`, `useSWR<TagsListDTO>("/api/tags?include_shared=...")`.
- Lokalnie: `searchTerm` (debounce 300ms); na mobile `hasMore`, `loadingMore` dla infinite scroll.
- Synchronizacja z URL: filtry aktualizują query params; historia nawigacji.

## 7. Integracja API

- GET `/api/notes` → `NotesListDTO` (z nagłówkiem `X-Total-Count`).
- GET `/api/tags` → `TagsListDTO`.
- POST `/api/tags` → `TagDTO` (po utworzeniu – invalidate tags + ewentualnie refetch notes).
- PATCH `/api/tags/{id}` → `TagDTO` (invalidate tags, notes jeśli zmiana nazwy wpływa na prezentację).
- DELETE `/api/tags/{id}` → 204 (obsłuż restrykcję i komunikat gdy `note_count` > 0).

## 8. Interakcje użytkownika

- Zmiana filtrów → aktualizacja URL + refetch.
- Wyszukiwanie → filtrowanie client-side + highlight.
- Zmiana strony / przewinięcie → pobranie następnej strony.
- CRUD etykiet → toasty + invalidacja cache.

## 9. Warunki i walidacja

- `limit` ≤ 100; `page` ≥ 1.
- Daty: `YYYY-MM-DD`.
- Status: enum lub null.
- Etykieta: case-insensitive unikalność (409 przy tworzeniu/zmianie nazwy).

## 10. Obsługa błędów

- 401/403 → redirect `/login` + toast.
- 404 (pusta lista dla filtrów) → puste stany zamiast błędu.
- 409 (tag name conflict) → komunikat + wskaż istniejącą etykietę.
- 429 → countdown, zablokuj intensywne odświeżanie.
- 5xx → toast i przycisk „Spróbuj ponownie”.

## 11. Kroki implementacji

1. Utwórz `/src/pages/notes.astro` z SSR dla `/api/tags` i `/api/notes` wg URL.
2. Zaimplementuj `AppShell` z responsywnym `TagSidebar` (drawer na mobile).
3. Dodaj `FiltersPanel` i `SearchInput` zsynchronizowane z URL.
4. Zaimplementuj `NoteList` z wirtualizacją >100, `NoteListItem` i na mobile `InfiniteLoader`.
5. Dodaj CRUD etykiet w sidebarze i `TagAccess` trigger (modal osobny widok).
6. Obsłuż stany błędów, puste stany, toasty i invalidację cache po mutacjach.
