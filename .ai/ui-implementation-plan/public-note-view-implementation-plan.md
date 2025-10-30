# Plan implementacji widoku Publiczne podsumowanie

## 1. Przegląd

Widok prezentuje publiczny podgląd podsumowania notatki (read-only) na podstawie tokenu. Bez nawigacji aplikacji, z minimalnym layoutem. Nigdy nie pokazuje oryginału treści. Obsługuje 404 dla nieprawidłowego/wyłączonego tokenu oraz rate limiting (429).

## 2. Routing widoku

- Ścieżka: `/share/{token}` (publiczny)
- SEO: `noindex, nofollow`; brak OG preview
- SSR: zalecany (szybkie wyświetlenie minimalnego layoutu), później ewentualne odświeżenie

## 3. Struktura komponentów

- PublicNotePage (kontener)
  - SummaryDisplay
  - GoalStatusBadge
  - MeetingDateDisplay
  - ErrorState (dla 404/429/5xx)

## 4. Szczegóły komponentów

### SummaryDisplay

- Opis: Prezentacja streszczenia notatki (tylko tekst).
- Elementy: nagłówek + blok tekstowy.
- Interakcje: brak.
- Walidacja: XSS-safe render.
- Typy: `PublicNoteDTO["summary_text"]`.
- Propsy: `{ text }`.

### GoalStatusBadge

- Opis: Ikona/kolor statusu: achieved/not_achieved/undefined.
- Elementy: badge/label z ikoną i ARIA label.
- Interakcje: brak.
- Walidacja: enum/null.
- Typy: `PublicNoteDTO["goal_status"]`.
- Propsy: `{ value }`.

### MeetingDateDisplay

- Opis: Data spotkania (format pl-PL) i data utworzenia public linku (opcjonalnie w stopce).
- Elementy: tekst, ikona kalendarza (opcjonalnie).
- Interakcje: brak.
- Walidacja: poprawny format `YYYY-MM-DD` po stronie danych.
- Typy: `PublicNoteDTO["meeting_date"]`, `PublicNoteDTO["created_at"]`.
- Propsy: `{ meetingDate, createdAt }`.

### ErrorState

- Opis: Predefiniowane karty błędów 404/429/5xx.
- Elementy: tytuł, opis, CTA „Powrót”.
- Interakcje: przyciski nawigacji.
- Walidacja: brak.
- Typy/Props: `{ code: 404|429|500, retryAfter?: number }`.

## 5. Typy

- Z `src/types.ts`: `PublicNoteDTO`.
- Nowe:
  - `PublicNoteVM`: `{ data?: PublicNoteDTO; isLoading: boolean; errorCode?: number; retryAfter?: number }`.

## 6. Zarządzanie stanem

- SSR: spróbuj pobrać `/api/share/{token}`; przy błędzie 404/429/5xx renderuj `ErrorState`.
- CSR: brak konieczności SWR; prosta logika stanu błędów.

## 7. Integracja API

- GET `/api/share/{token}` → `PublicNoteDTO` `{ summary_text, meeting_date, goal_status, created_at }`.
- Nagłówki: `X-Robots-Tag: noindex, nofollow`; `Cache-Control: private, no-cache`.
- Błędy: 404 (invalid/disabled), 429 (limit wyświetleń z `Retry-After`).

## 8. Interakcje użytkownika

- Brak edycji; tylko przegląd. CTA powrotu do strony głównej.

## 9. Warunki i walidacja

- Nigdy nie wyświetlaj `original_content`.
- Szanuj 429: countdown i zablokuj próby odświeżania.

## 10. Obsługa błędów

- 404: pokaż kartę z informacją „Link nie istnieje lub został wyłączony”.
- 429: pokaż countdown wg `Retry-After`.
- 5xx: pokaż komunikat i spróbuj ponownie po odświeżeniu.

## 11. Kroki implementacji

1. Utwórz `/src/pages/share/[token].astro` z SSR pobierając `/api/share/{token}` i ustawiając meta `noindex,nofollow`.
2. Zaimplementuj `PublicNotePage` i podkomponenty wyświetlające dane.
3. Dodaj `ErrorState` dla 404/429/5xx z odpowiednimi komunikatami i CTA.
4. Testy: poprawne tokeny, wyłączony link (404), limit wyświetleń (429).
