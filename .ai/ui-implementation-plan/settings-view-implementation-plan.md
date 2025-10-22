# Plan implementacji widoku Ustawienia / Profil użytkownika

## 1. Przegląd

Widok prezentuje informacje o profilu, statystyki wykorzystania AI oraz sekcję bezpieczeństwa z procesem usunięcia konta (RODO) z wielostopniowym potwierdzeniem.

## 2. Routing widoku

- Ścieżka: `/settings` (chroniony)
- SSR: można pobrać wstępnie `profile` i `stats`; reszta CSR

## 3. Struktura komponentów

- SettingsPage (kontener)
  - Tabs/Sections: ProfileSection | StatsSection | SecuritySection | DangerZone
  - ProfileSection: e-mail, data założenia
  - StatsSection: karty metryk (z `user_generation_stats` i liczników notatek/etykiet)
  - SecuritySection: informacje o sesji, link do zmiany hasła (poza MVP)
  - DangerZone: DeleteAccountWizard (modal/stepper)
  - ToastHost

## 4. Szczegóły komponentów

### ProfileSection

- Opis: Prezentuje e-mail i datę utworzenia konta.
- Elementy: etykiety/teksty, ikonografia.
- Interakcje: brak (read-only).
- Walidacja: brak.
- Typy: `UserProfileDTO`.
- Propsy: `{ profile }`.

### StatsSection

- Opis: Karty metryk: total_generations, successful/failed, tokens, avg_time, total_notes, total_tags.
- Elementy: StatCards, wykres (opcjonalnie post-MVP).
- Interakcje: brak.
- Walidacja: wartości numeryczne >= 0.
- Typy: `UserStatsDTO`.
- Propsy: `{ stats }`.

### DangerZone / DeleteAccountWizard

- Opis: Wielostopniowy proces usuwania konta.
- Elementy: opis konsekwencji, input e-mail do potwierdzenia, checkbox „nieodwracalne”, przycisk Usuń.
- Interakcje: onConfirm → DELETE /api/user/account; po sukcesie logout i redirect `/`.
- Walidacja: `confirmation_email` musi odpowiadać emailowi użytkownika; checkbox zaznaczony.
- Typy: `DeleteAccountCommand`.
- Propsy: `{ userEmail, onDelete }`.

## 5. Typy

- Z `src/types.ts`: `UserProfileDTO`, `UserStatsDTO`, `DeleteAccountCommand`.
- Nowe:
  - `SettingsVM`: `{ profile?: UserProfileDTO; stats?: UserStatsDTO; loading: boolean; deleting: boolean; error?: string }`.

## 6. Zarządzanie stanem

- SWR: `useSWR<UserProfileDTO>("/api/user/profile")`, `useSWR<UserStatsDTO>("/api/user/stats")`.
- Lokalnie: stan modala kasowania, pola formularza (email, checkbox), `deleting`.

## 7. Integracja API

- GET `/api/user/profile` → `UserProfileDTO`.
- GET `/api/user/stats` → `UserStatsDTO`.
- DELETE `/api/user/account` (body: `DeleteAccountCommand`) → 204; po sukcesie: logout + redirect `/`.

## 8. Interakcje użytkownika

- Przełączanie sekcji/tabs.
- Inicjacja usunięcia konta → wypełnienie email + checkbox → potwierdzenie.

## 9. Warunki i walidacja

- `confirmation_email` musi dokładnie pasować do `profile.email`.
- Checkbox „nieodwracalne” wymagany.

## 10. Obsługa błędów

- 400: niezgodny email → inline error.
- 401/403: redirect do `/login`.
- 5xx: toast i „Spróbuj ponownie”.

## 11. Kroki implementacji

1. Utwórz `/src/pages/settings.astro` z SSR (opcjonalnie) i osadź `SettingsPage`.
2. Dodaj `ProfileSection` i `StatsSection` z danymi z SWR.
3. Zaimplementuj `DeleteAccountWizard` z walidacją i wywołaniem DELETE.
4. Po sukcesie: logout (Supabase) i redirect `/`.
