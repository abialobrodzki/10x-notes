# Architektura UI dla 10xNotes (MVP)

## 1. Przegląd struktury UI

- Cel: szybkie generowanie i porządkowanie podsumowań spotkań (streszczenie + status celów) z prostym udostępnianiem i kontrolą dostępu.
- Technologie i założenia:
  - Astro 5 (SSR) + React 19 dla interaktywności; TypeScript 5; Tailwind CSS 4; shadcn/ui (styl „new-york”).
  - Dostępność: WCAG AA, ARIA landmarks, focus management, pełna nawigacja klawiaturą.
  - Bezpieczeństwo: Supabase Auth (JWT), role: owner/recipient/anon; public links z noindex/nofollow; renderowanie akcji wg `is_owner`.
  - Zarządzanie danymi: SSR initial data w stronach Astro (SEO, szybkość); client-side SWR (domyślnie) w komponentach React (cache, revalidate, optimistic updates, rollback, invalidacja).
  - Wzorce UI: master-detail (lista notatek + szczegóły), inline editing, skeleton loading (timeout 60 s + retry), toast (Sonner) dla sukcesów/błędów/rate limit.
  - Responsywność: mobile-first. Mobile: pojedyncze ekrany i infinite scroll; Desktop: sidebar + lista + szczegóły, paginacja.
- Informacja architektoniczna o URL/stanach:
  - URL state (query params) dla filtrów: `tag_id`, `goal_status`, `date_from`, `date_to`, `page`, `limit`, `include_shared`.
  - Local/session storage (TTL 24h) dla „generuj bez logowania” (przeniesienie do formularza zapisu po logowaniu).
- Priorytetowe UX:
  - Licznik znaków + ostrzeżenie >4500 i twardy limit 5000.
  - Wyróżnianie fraz w wynikach wyszukiwania, debounce 300 ms.
  - Jasne stany: loading/success/error, puste stany, 429 (countdown z `Retry-After`).

## 1.1. Globalna nawigacja (Navbar)

- Komponent: `Navbar` (`src/components/layout/Navbar.tsx`)
- Integracja: conditional rendering w `Layout.astro` (tylko dla zalogowanych użytkowników)
- Główny cel: globalna nawigacja między widokami, wylogowanie, dostęp do ustawień, **generowanie nowych notatek**
- Kluczowe elementy:
  - **Logo/Brand**: link do `/notes` (zalogowani) lub `/` (niezalogowani)
  - **Link "Moje notatki"**: nawigacja do `/notes`
  - **Przycisk "Generuj notatkę"** (NOWY): link do `/` z gradientem purple→pink, ikona Plus
  - **User menu** (desktop):
    - Email użytkownika widoczny obok ikony (z `GET /api/user/profile`)
    - Dropdown z opcjami:
      - "Ustawienia" → `/settings`
      - "Wyloguj się" → `supabaseClient.auth.signOut()` + clear storage + redirect `/`
  - **Mobile menu**: hamburger z tymi samymi opcjami (Moje notatki, Generuj notatkę, Ustawienia, Wyloguj), email widoczny obok ikony
  - **Niezalogowani** (landing page): przyciski "Zaloguj się" (ghost) + "Zarejestruj się" (gradient CTA)
- Design:
  - Glassmorphism: `bg-gradient-to-r from-gradient-from/90 via-gradient-via/90 to-gradient-to/90`, `border-glass-border`, `backdrop-blur-xl`
  - Kolory tekstu: `text-glass-text`, `hover:text-glass-text-hover`
  - Focus ring: `focus:ring-2 focus:ring-input-border-focus`
  - Destructive (logout): `text-destructive`, `hover:bg-destructive/10`
  - CTA gradient: `from-gradient-button-from to-gradient-button-to` (purple→pink)
- UX/a11y:
  - Sticky positioning (`sticky top-0 z-50`)
  - Keyboard navigation (focus trap w dropdown)
  - Screen reader labels (`sr-only`)
  - Toast notification po wylogowaniu
  - Spójne hover states (white/5 dla przezroczystości glassmorphism)
- Security:
  - Proper logout flow (signOut + clear localStorage/sessionStorage)
  - No PII exposure (tylko email, który jest już znany użytkownikowi)

## 2. Lista widoków

1. Widok: Landing – Generowanie podsumowania (wszyscy użytkownicy)

- Ścieżka: `/`
- Główny cel: wklejenie treści (do 5000 znaków) i wygenerowanie podsumowania dla wszystkich użytkowników.
- **UWAGA**: Widok dostępny zarówno dla zalogowanych jak i niezalogowanych - nie ma redirectu.
- Kluczowe informacje:
  - Textarea z licznikiem znaków i walidacją limitu.
  - Po wygenerowaniu: streszczenie, status celów (✓/✗/?), sugerowana etykieta.
  - **Niezalogowani**: Komunikat/CTA „Zaloguj się, aby zapisać notatkę" + zachowanie danych w storage (24h).
  - **Zalogowani**: Przycisk „Zapisz notatkę" → bezpośredni zapis (POST /api/notes) → redirect do `/notes/{id}`.
- Kluczowe komponenty widoku:
  - Textarea z licznikiem (CharCountTextarea), przycisk „Generuj podsumowanie".
  - Skeleton/loader dla statusu generowania (3–10 s, timeout 60 s). Toast/retry przy błędach.
  - Podsumowanie (SummaryCard).
  - **Warunkowe renderowanie**:
    - SaveNoteButton (zalogowani): zielony banner z przyciskiem zapisu
    - SavePromptBanner (niezalogowani): niebieski banner z przyciskami logowania/rejestracji
- UX, dostępność i bezpieczeństwo:
  - A11y: aria-describedby (licznik + błąd), role="status" dla wyników AI (`aria-live="polite"`).
  - Limit 5000 (blokada inputu), ostrzeżenie wizualne >4500.
  - Timeout 30 s: komunikat z opcją „Spróbuj ponownie".
  - Storage TTL 24h (tylko dla niezalogowanych); brak PII; XSS: automatyczny escape + ostrożność przy renderze.
- Wykorzystywane endpointy API:
  - `POST /api/ai/generate` (wszyscy)
  - `POST /api/notes` (tylko zalogowani)

2. Widok: Logowanie

- Ścieżka: `/login`
- Główny cel: zalogowanie użytkownika; po sukcesie: odczyt danych z storage i pre-wypełnienie formularza zapisu.
- Kluczowe informacje: formularz e-mail/hasło, komunikaty błędów.
- Kluczowe komponenty: formularz z walidacją (Zod), „Pokaż hasło”, link do rejestracji.
- UX/a11y/security: semantyczne label/description, keyboard nav, komunikaty o błędach jako `role="alert"`; bezpieczne przechowywanie tokenu, redirect back.
- Endpointy: Supabase Auth (po stronie backendu/middleware), brak własnych `/api/*` w tym widoku.

3. Widok: Rejestracja

- Ścieżka: `/register`
- Główny cel: utworzenie konta; po sukcesie – analogiczny przepływ jak po logowaniu.
- Kluczowe informacje: formularz e-mail/hasło + potwierdzenie.
- Kluczowe komponenty: formularz z walidacją, checkbox zgód (jeśli wymagane), komunikaty.
- UX/a11y/security: jak wyżej; po rejestracji e-mail verification (poza UI MVP), redirect back.
- Endpointy: Supabase Auth.

4. Widok: Lista notatek (chroniony)

- Ścieżka: `/notes` (+ filtry: `?tag_id={id}&goal_status={v}&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&page=1&limit=20&include_shared=false`)
- Główny cel: przegląd, wyszukiwanie, filtrowanie i nawigacja do szczegółów.
- Kluczowe informacje:
  - Lista notatek (streszczenie, data, status celu, nazwa etykiety, znaczniki: AI/public link/owner).
  - Sidebar z etykietami (nazwa + `note_count`), akcje: dodaj/edytuj/usuń etykietę, zarządzaj dostępem.
  - Filtry: zakres dat (DateRangePicker), status celu (multi-select), wyszukiwarka frazy (client-side, highlight).
  - Paginacja (desktop) / infinite scroll (mobile).
- Kluczowe komponenty widoku:
  - AppShell: stały sidebar (desktop) / szuflada (mobile), obszar treści.
  - TagSidebar (lista etykiet + akcje), FiltersPanel, SearchInput z debounce, NoteList (+ wirtualizacja >100 pozycji), Pagination/InfiniteLoader, Breadcrumbs (desktop).
- UX/a11y/security:
  - A11y: landmarks `<nav>`, `<main>`, `<aside>`; focus outlines; „/” otwiera search.
  - URL jako źródło prawdy dla filtrów (shareable links).
  - Recipient vs owner: oznaczenia i wyłączone akcje edycji.
- Endpointy: `GET /api/tags`, `GET /api/notes`.

5. Widok: Szczegóły notatki (chroniony)

- Ścieżka: `/notes/{id}`
- Główny cel: podgląd (recipient) i edycja (owner) notatki: oryginał, podsumowanie, status celów, data, etykieta; zarządzanie publicznym linkiem.
- Kluczowe informacje:
  - Pełna treść oryginału, podsumowanie, status celu (radio), data spotkania (date picker), etykieta (combobox), meta (AI/public link/owner), link publiczny (token, is_enabled).
- Kluczowe komponenty widoku:
  - InlineEditableField (Summary), GoalStatusRadio (✓/✗/?), TagCombobox, DatePicker, PublicLinkToggle + CopyLink + RotateToken, Save/Cancel przy edycjach.
  - Sekcja „Zarządzaj dostępem” do etykiety (otwiera modal – patrz widok 7).
- UX/a11y/security:
  - Akcje edycji ukryte/wyłączone dla recipienta (`is_owner=false`).
  - Zmiany z optimistic update + rollback przy błędzie; toast feedback; invalidacja cache listy.
  - Długie treści: truncate (6–8 linii) + „Pokaż więcej”.
- Endpointy: `GET /api/notes/{id}`, `PATCH /api/notes/{id}`, `POST /api/notes/{id}/public-link`, `PATCH /api/notes/{id}/public-link`, `POST /api/notes/{id}/public-link/rotate`, `DELETE /api/notes/{id}/public-link`.

6. Widok: Publiczne podsumowanie (anon)

- Ścieżka: `/share/{token}`
- Główny cel: wyświetlenie podsumowania (read-only) po tokenie.
- Kluczowe informacje: streszczenie, data spotkania, status celu.
- Kluczowe komponenty: minimalny layout bez nawigacji; komunikat 404 przy nieprawidłowym/wyłączonym tokenie.
- UX/a11y/security:
  - Meta: `noindex, nofollow`; brak OG preview.
  - Brak nawigacji i akcji edycji; prywatność – nigdy nie pokazuj oryginału.
- Endpointy: `GET /api/share/{token}`.

7. Widok: Zarządzanie dostępem do etykiety (modal – owner)

- Kontekst: z sidebaru lub szczegółów notatki (przycisk „Zarządzaj dostępem”).
- Główny cel: przegląd i modyfikacja listy odbiorców (read-only access do notatek z daną etykietą).
- Kluczowe informacje: lista odbiorców (email, granted_at), formularz dodawania nowego odbiorcy po e-mail, akcja usunięcia.
- Kluczowe komponenty: Dialog/Modal, RecipientList, EmailInput (+ walidacja), AddButton, RemoveButton, puste stany.
- UX/a11y/security:
  - A11y: focus trap, ESC to close, role="dialog".
  - Komunikaty o błędach (nieistniejący użytkownik, niepotwierdzony e-mail).
- Endpointy: `GET /api/tags/{id}/access`, `POST /api/tags/{id}/access`, `DELETE /api/tags/{id}/access/{recipient_id}`.

8. Widok: Zarządzanie etykietami (sidebar – owner)

- Kontekst: panel boczny w `/notes`.
- Główny cel: tworzenie, edycja nazwy, usuwanie etykiet z uwzględnieniem ograniczeń.
- Kluczowe informacje: lista etykiet (nazwa, `note_count`, wskaźnik udostępnienia), formularz „Utwórz nową: {name}”, inline rename, delete z ostrzeżeniem.
- Kluczowe komponenty: TagList, TagCreateCombobox, InlineRename, ConfirmDialog (rename impact), DeleteDialog z komunikatem o `note_count`.
- UX/a11y/security:
  - Nazwy unikalne (case-insensitive) w ramach konta; walidacja i komunikaty kolizji (409).
  - Usuwanie z ON DELETE RESTRICT – pokaż komunikat i alternatywy (przepisanie notatek).
- Endpointy: `GET /api/tags`, `POST /api/tags`, `PATCH /api/tags/{id}`, `DELETE /api/tags/{id}`.

9. Widok: Ustawienia / Profil użytkownika (chroniony)

- Ścieżka: `/settings`
- Główny cel: profil, statystyki, bezpieczeństwo, usunięcie konta.
- Kluczowe informacje:
  - Profil: e-mail, data utworzenia.
  - Statystyki: z `user_generation_stats` + licznik notatek i etykiet.
  - „Danger Zone”: proces usuwania konta (wielostopniowe potwierdzenie: e-mail + checkbox „nieodwracalne”).
- Kluczowe komponenty: sekcje/tabs (Profile, Stats, Security, Danger Zone), StatCards, DeleteAccountWizard (modal/stepper).
- UX/a11y/security:
  - Jasne konsekwencje, 404 dla public links do usuniętych notatek.
  - Po DELETE: logout i redirect na `/`.
- Endpointy: `GET /api/user/profile`, `GET /api/user/stats`, `DELETE /api/user/account`.

Stany błędów i puste stany (globalnie, stosowane w widokach):

- 401/403: przekierowanie do `/login` + toast „Zaloguj się, aby kontynuować”.
- 404: karty z opisem i CTA powrotu (np. public link wyłączony).
- 408/503 (AI): informacja + retry.
- 429: toast z countdown wg `Retry-After` i wyłączone przyciski.

## 3. Mapa podróży użytkownika

Przepływ 1A: Generuj jako niezalogowany → Rejestracja/Logowanie → Zapis

1. `/` – wklej tekst (limit 5000) → „Generuj" → `POST /api/ai/generate` (loader/skeleton, timeout 60 s, retry).
2. Wynik: streszczenie + status celów + sugerowana etykieta → CTA „Zaloguj się, aby zapisać" (dane → storage TTL 24h).
3. `/login` lub `/register` → po sukcesie odczyt storage i pre-wypełnienie formularza zapisu.
4. „Zapisz" → `POST /api/notes` (z `tag_id` lub `tag_name`; walidacja XOR). Toast „Zapisano".
5. Redirect → `/notes/{id}` (szczegóły).

Przepływ 1B: Generuj jako zalogowany → Bezpośredni zapis (NOWY)

1. Kliknij "Generuj notatkę" w navbar → `/`
2. Wklej tekst (limit 5000) → „Generuj" → `POST /api/ai/generate` (loader/skeleton, timeout 60 s, retry).
3. Wynik: streszczenie + status celów + sugerowana etykieta → zielony banner „Gotowe! Zapisz notatkę".
4. Kliknij „Zapisz notatkę" → `POST /api/notes` (z wygenerowanymi danymi). Toast „Notatka zapisana!".
5. Redirect → `/notes/{id}` (szczegóły nowej notatki).

Przepływ 2: Zarządzanie notatkami i etykietami

1. `/notes` – SSR initial data + SWR; sidebar `GET /api/tags`, lista `GET /api/notes` (filtry w URL).
2. Wyszukiwanie (client-side, debounce) + highlight; filtry daty/statusu, paginacja/infinite scroll.
3. Kliknięcie notatki → `/notes/{id}` – `GET /api/notes/{id}`.
4. Edycja (owner) → `PATCH /api/notes/{id}` (optimistic + rollback, invalidacja cache listy/detalu).
5. Sidebar etykiety: create/rename/delete (`POST/PATCH/DELETE /api/tags{...}`) z potwierdzeniami.

Przepływ 3: Udostępnianie
A. Publiczny link (owner)

1. `/notes/{id}` – toggle „Udostępnij publicznie”.
2. Włącz → `POST /api/notes/{id}/public-link` (zwraca token + URL). Kopiuj link → toast „Skopiowano!”.
3. Wyłącz → `PATCH /api/notes/{id}/public-link` (`is_enabled=false`).
4. Rotacja tokenu (ostrz.) → `POST /api/notes/{id}/public-link/rotate`.
   B. Dostęp do etykiety (owner)
5. Sidebar/Details → „Zarządzaj dostępem” (modal).
6. Lista odbiorców → `GET /api/tags/{id}/access`.
7. Dodaj e-mail → `POST /api/tags/{id}/access` (walidacje, komunikaty).
8. Usuń dostęp → `DELETE /api/tags/{id}/access/{recipient_id}`.

Przepływ 4: Usunięcie konta (RODO)

1. `/settings` → sekcja „Danger Zone”.
2. Potwierdzenia (e-mail, checkbox) → `DELETE /api/user/account`.
3. Logout → redirect `/`.

## 4. Układ i struktura nawigacji

- App Shell
  - Desktop: stały sidebar (TagSidebar) + obszar treści (lista + szczegóły – split view lub dwukolumnowy layout). Breadcrumbs nad treścią.
  - Tablet: sidebar + treść (przełączanie lista/szczegóły jako osobne ekrany).
  - Mobile: hamburger (Sheet/Drawer) dla sidebaru, pełnoekranowa lista; szczegóły w osobnym ekranie; infinite scroll.
- Nawigacja między widokami
  - Główna: sidebar (etykiety) → filtruje `/notes?tag_id={id}`.
  - Routing:
    - Anon: `/`, `/login`, `/register`, `/share/{token}`.
    - Chronione: `/notes`, `/notes/{id}`, `/settings`.
  - Skróty: „/” otwiera wyszukiwarkę; `Esc` zamyka modale.
- URL i stan
  - Query params reprezentują filtry/paginację (linkowalne). Zmiany UI aktualizują URL, SSR może wykorzystywać stan URL.
- A11y i SEO
  - Landmarks: `<nav aria-label="Sidebar etykiet">`, `<main>`, `<aside aria-label="Filtry notatek">`.
  - Public: `noindex, nofollow` + brak OG preview.

## 5. Kluczowe komponenty (wielokrotnego użytku)

- AppShell
  - Layout z responsywnym sidebar/drawer, breadcrumbami, obszarem treści i slotami na filtry.
- TagSidebar
  - Lista etykiet z `note_count`, akcje: create (Combobox „Utwórz nową: {name}”), inline rename (z potwierdzeniem), delete (z komunikatem o `note_count`), „Zarządzaj dostępem”.
- NoteList (+ NoteListItem)
  - Kafelki/wiersze: tytuł (z fragmentu streszczenia), data, status celu (ikona/kolor), etykieta, wskaźniki AI/public link/owner. Wirtualizacja >100.
  - **Empty state** (NOWY): gdy brak notatek, pokazuje komunikat "Brak notatek" + przycisk "Generuj pierwszą notatkę" (link do `/`) z gradientem purple→pink. Przycisk nie pojawia się gdy lista jest pusta przez wyszukiwanie.
- FiltersPanel
  - DateRangePicker (shadcn/ui), GoalStatusMultiSelect, SortSelect, Reset/Apply. Aktualizuje URL i odświeża listę.
- SearchInput
  - Debounce 300 ms, highlight fraz w wynikach.
- CharCountTextarea
  - Live counter, ostrzeżenie >4500, blokada na 5000 (maxlength), komunikaty błędów.
- SummaryCard
  - Prezentacja wyników AI: streszczenie, status celów (GoalStatusRadio), sugerowana etykieta.
- SaveNoteButton (NOWY)
  - Dla zalogowanych użytkowników na landing page. Zielony banner z przyciskiem "Zapisz notatkę" (gradient purple→pink). Wywołuje POST /api/notes i redirectuje do /notes/{id}. Obsługuje loading state i błędy (401, 400, 429).
- GoalStatusRadio
  - Trzy stany: achieved (zielony ✓), not_achieved (czerwony ✗), undefined (szary ?); z etykietami dostępnościowymi.
- PublicLinkControls
  - Toggle on/off, CopyLink, RotateToken (z ostrzeżeniem). Pokazywane tylko ownerowi.
- TagAccessModal
  - Dialog: lista odbiorców, dodawanie (EmailInput + Add), usuwanie (X). Błędy i puste stany.
- Pagination / InfiniteLoader
  - Desktop: paginacja z informacją o `X-Total-Count`; Mobile: infinite scroll z sentinel/loader.
- Toast (Sonner)
  - Sukcesy/błędy, pozycja top-right; szczególne: 429 – countdown z `Retry-After` i disabled akcji.
- Skeletons & Spinners
  - Skeleton dla list/detali/AI; spinner dla akcji krótkich (np. rotate token, grant access).
- AuthProvider (React Context)
  - Stan auth, auto-refresh tokenów, ochrona tras chronionych.

—
Uwagi implementacyjne (ramowe, bez kodu):

- SSR w stronach Astro dla `/notes` (wstępne pobranie listy/tagów wg URL). Interaktywność i aktualizacje przez SWR.
- Invalidacja cache po operacjach mutujących (SWR `mutate`). Optimistic updates z bezpiecznym rollbackiem.
- Odróżnianie ról i stanów przycisków: owner (edycja aktywna) vs recipient (disabled/hidden).
- i18n: UI w PL w MVP; obsługa treści wielojęzycznych przez backend/LLM (bez przełącznika języka w UI).
- Wydajność: lazy loading sekcji (np. TagAccessModal), wirtualizacja list przy >100 elementach.
