# Plan implementacji widoku Landing (Generowanie podsumowania)

## 1. Przegląd

Widok umożliwia wklejenie treści (do 5000 znaków) i wygenerowanie podsumowania dla **wszystkich użytkowników** (zalogowanych i niezalogowanych):

- **Niezalogowani**: Po wygenerowaniu pokazuje SavePromptBanner zachęcający do zalogowania/rejestracji. Dane są zapisywane w localStorage (TTL 24h) i przywracane po logowaniu.
- **Zalogowani**: Po wygenerowaniu pokazuje SaveNoteButton umożliwiający bezpośredni zapis notatki (POST /api/notes) z automatycznym przekierowaniem do szczegółów nowej notatki.

## 2. Routing widoku

- Ścieżka: `/` (publiczny, dostępny dla wszystkich)
- SSR: `optionalAuth` middleware - sprawdza czy użytkownik jest zalogowany, przekazuje `isAuthenticated` do komponentu
- **UWAGA**: Brak redirectu dla zalogowanych użytkowników - landing page jest dostępny dla wszystkich jako główny generator notatek

## 3. Struktura komponentów

- LandingPage (kontener, przyjmuje prop `isAuthenticated`)
  - CharCountTextarea (textarea + licznik + walidacja limitu)
  - GenerateButton
  - GenerationSkeleton (loading 3–10s, timeout 60s)
  - SummaryCard (wynik AI: streszczenie, goal status, sugerowana etykieta)
  - **Warunkowe renderowanie:**
    - SaveNoteButton (zalogowani: bezpośredni zapis → POST /api/notes)
    - SavePromptBanner (niezalogowani: CTA do logowania/rejestracji + zapis do storage)
  - ToastHost (powiadomienia)

## 4. Szczegóły komponentów

### CharCountTextarea

- Opis: Pole wprowadzania treści z licznikiem i blokadą >5000.
- Główne elementy: `<label>`, `<textarea>` z `maxlength=5000`, wskaźnik „X/5000", alert ostrzegawczy >4500.
- Obsługiwane interakcje: onInput (aktualizacja stanu), walidacja limitu, focus management.
- Obsługiwana walidacja: długość ≤5000; >4500 ostrzeżenie wizualne.
- Typy: `original_content: string`.
- Propsy: `{ value, onChange }`.

### GenerateButton

- Opis: Uruchamia generowanie podsumowania.
- Główne elementy: `<button>` (disabled gdy brak treści lub przekroczony limit).
- Interakcje: onClick → POST /api/ai/generate z timeoutem 60s; blokada przycisku podczas requestu.
- Walidacja: brak dodatkowej (opiera się o CharCountTextarea).
- Typy: `GenerateAiSummaryCommand`.
- Propsy: `{ disabled, onGenerate }`.

### GenerationSkeleton

- Opis: Skeleton/loader dla stanu oczekiwania 3–10s (timeout 60s + retry CTA).
- Elementy: placeholdery kart, paski.
- Interakcje: Retry (onRetry).
- Walidacja: brak.
- Typy/Props: `{ visible, onRetry }`.

### SummaryCard

- Opis: Prezentuje wynik AI: streszczenie, status celów (ikona/kolor), sugerowaną etykietę.
- Elementy: tytuł, blok tekstu, `GoalStatusDisplay`, `SuggestedTagBadge`.
- Interakcje: brak modyfikacji (edycja dopiero po zapisie w widoku chronionym).
- Walidacja: XSS-safe render (tekst plain).
- Typy: `AiSummaryDTO`.
- Propsy: `{ data: AiSummaryDTO }`.

### SaveNoteButton (nowy komponent - dla zalogowanych)

- Opis: Bezpośredni zapis wygenerowanej notatki dla zalogowanych użytkowników.
- Elementy: zielony komunikat „Gotowe! Zapisz notatkę", przycisk „Zapisz notatkę" z gradientem.
- Interakcje: onClick → POST `/api/notes` (z credentials: include) → redirect do `/notes/{id}` (szczegóły).
- Walidacja: obsługa błędów API (401, 400, 429).
- Typy: przyjmuje `originalContent: string`, `aiResult: AiSummaryDTO`.
- Propsy: `{ originalContent: string; aiResult: AiSummaryDTO }`.
- Stan: `isSaving: boolean` (loading state podczas zapisu).

### SavePromptBanner (dla niezalogowanych)

- Opis: CTA „Zaloguj się, aby zapisać notatkę"; zapisuje dane do storage (TTL 24h) i kieruje do `/login`.
- Elementy: niebieski komunikat, przyciski „Zaloguj się" / „Zarejestruj się".
- Interakcje: onClick → zapis `pendingGeneratedNote` (content + wynik AI + timestamp) → redirect.
- Walidacja: TTL 24h (po zalogowaniu weryfikacja wieku danych).
- Typy: `PendingGeneratedNoteVM` (nowy VM).
- Propsy: `{ originalContent: string; aiResult: AiSummaryDTO }`.

## 5. Typy

- Z `src/types.ts`: `GenerateAiSummaryCommand`, `AiSummaryDTO`.
- Nowe:
  - `PendingGeneratedNoteVM`: `{ original_content: string; summary_text: string; goal_status: GoalStatus; suggested_tag: string | null; created_at: number /* epoch ms */ }`.
  - `LandingVM`: `{ input: string; isGenerating: boolean; error?: string; result?: AiSummaryDTO }`.

## 6. Zarządzanie stanem

- Lokalny stan React: `input`, `isGenerating`, `result`, `error`.
- Timeout 60s: `AbortController` + fallback `onRetry`.
- Storage: `localStorage` (lub `sessionStorage`) z kluczem `pendingGeneratedNote`, TTL 24h (weryfikowane po timestampie).

## 7. Integracja API

- POST `/api/ai/generate` (wszyscy użytkownicy)
  - Request: `GenerateAiSummaryCommand` `{ original_content: string, model_name?: string }`
  - Response: `AiSummaryDTO` `{ summary_text, goal_status, suggested_tag, generation_time_ms, tokens_used }`
  - Statusy błędów: 400 (walidacja), 504 (timeout), 429 (rate limit), 503 (AI service)

- POST `/api/notes` (tylko zalogowani - SaveNoteButton)
  - Request: `CreateNoteCommand` `{ original_content, summary_text, goal_status, tag_name, is_ai_generated }`
  - Response: `NoteDTO` `{ id, ...note data }`
  - Statusy błędów: 400 (walidacja), 401 (brak autentykacji), 429 (rate limit)

## 8. Interakcje użytkownika

- Wpisywanie treści → licznik znaków aktualizuje się w locie.
- Klik „Generuj podsumowanie” → skeleton → wynik lub błąd + retry.
- Klik „Zaloguj się/Zarejestruj się” → zapis do storage → redirect.

## 9. Warunki i walidacja

- Treść: ≤5000 znaków; >4500 ostrzeżenie; przy >5000 blokada przycisku.
- Retry-After: jeśli 429, pokazuj countdown i wyłącz przycisk do końca odliczania.
- XSS: render plain text.

## 10. Obsługa błędów

- 400: „Nieprawidłowa treść” → pokaż inline.
- 408: „Przekroczono limit czasu” → CTA „Spróbuj ponownie” i zachowaj treść w polu.
- 429: toast z countdown (wg nagłówka `Retry-After`).
- 503/Network: toast „Coś poszło nie tak” + retry.

## 11. Kroki implementacji

1. ✅ Utwórz stronę `/src/pages/index.astro` z `optionalAuth` middleware przekazującym `isAuthenticated` do komponentu `LandingPage` (React).
2. ✅ Zaimplementuj `CharCountTextarea` z licznikami i walidacją.
3. ✅ Obsłuż `GenerateButton` z POST `/api/ai/generate`, skeleton i timeout 60s.
4. ✅ Dodaj `SummaryCard` do prezentacji wyniku AI.
5. ✅ Dodaj `SaveNoteButton` dla zalogowanych użytkowników (POST `/api/notes` → redirect do `/notes/{id}`).
6. ✅ Dodaj `SavePromptBanner` dla niezalogowanych zapisujący `pendingGeneratedNote` do storage i redirect do `/login`.
7. ✅ Dodaj toast dla błędów i countdown dla 429.
8. ✅ Zaimplementuj warunkowe renderowanie SaveNoteButton vs SavePromptBanner w zależności od `isAuthenticated`.
9. Testy manualne:
   - Niezalogowany: limity znaków, timeout, 429, retry, przejście do logowania i wsteczne wczytanie danych po zalogowaniu
   - Zalogowany: generowanie → zapis → redirect do szczegółów nowej notatki
