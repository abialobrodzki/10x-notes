# Specyfikacja Biznesowa: Nawigacja Mobilna z Użyciem Bottom Tab Bar (Wersja 2.0)

## 1. Cel Biznesowy

Celem zmiany jest fundamentalna poprawa doświadczenia użytkownika (UX) na urządzeniach mobilnych poprzez wdrożenie nowoczesnego, stałego paska nawigacyjnego na dole ekranu (Bottom Tab Bar). Ma to na celu zwiększenie odkrywalności kluczowych funkcji, przyspieszenie nawigacji oraz dostosowanie aplikacji do najlepszych, branżowych standardów projektowania interfejsów mobilnych.

## 2. Kontekst Technologiczny

Zmiany zostaną zaimplementowane z wykorzystaniem istniejącego stosu technologicznego:

- **Astro 5** jako framework.
- **React 19** do budowy interaktywnych komponentów UI.
- **TypeScript 5** dla bezpieczeństwa typów.
- **Tailwind CSS 4** do stylowania i implementacji designu responsywnego.
- **Shadcn/ui** jako biblioteka bazowych komponentów UI.
- **Lucide React** jako biblioteka ikon.

## 3. Opis Zmian

### 3.1. Wprowadzenie Komponentu `MobileBottomNav.tsx`

Zostanie utworzony nowy, reużywalny komponent React o nazwie `MobileBottomNav.tsx`.

- **Widoczność:** Komponent będzie widoczny **tylko na małych ekranach** (poniżej breakpointu `md`), a ukryty na tabletach i desktopach (`md:hidden`).
- **Pozycja:** Będzie na stałe przypięty do dolnej krawędzi ekranu (`fixed bottom-0`).
- **Funkcjonalność:** Będzie zawierał 4 główne przyciski nawigacyjne z ikonami i etykietami:
  1.  **Moje Notatki:** Link do `/notes`.
  2.  **Szukaj:** Akcja otwierająca pole wyszukiwania (może fokusować istniejące pole w `AppShell.tsx`).
  3.  **Generuj:** Link do `/` (strona główna z generowaniem AI).
  4.  **Ustawienia:** Link do `/settings`.
- **Aktywny stan:** Przycisk odpowiadający aktualnie otwartej ścieżce URL będzie wizualnie wyróżniony.

### 3.2. Zastąpienie Klasycznej Stopki

- Istniejąca, klasyczna stopka aplikacji (jeśli występuje w `Layout.astro`) zostanie ukryta na małych ekranach (`hidden md:block`), na rzecz nowego paska nawigacyjnego.

### 3.3. Dostosowanie `AppShell.tsx`

- Komponent `AppShell.tsx` zostanie zmodyfikowany, aby zintegrować i wyświetlać `MobileBottomNav.tsx` na widokach mobilnych.
- Istniejący nagłówek mobilny w `AppShell.tsx` może zostać uproszczony. Menu hamburgerowe (`Sheet`) pozostanie jako sposób dostępu do listy etykiet (nawigacja drugiego poziomu).

## 4. Wymagania Funkcjonalne i Dostępności

- **Brak naruszenia widoku desktop:** Wprowadzone zmiany **nie mogą** wpłynąć na działanie i wygląd aplikacji na ekranach desktopowych. Istniejący układ dwukolumnowy musi pozostać nienaruszony.
- **Płynne przejścia:** Przejścia między widokami (panelami) aktywowanymi przez dolną nawigację powinny być płynne (np. animacja `fade-in` o czasie trwania 200-300ms).
- **Zachowanie pozycji przewijania:** Pozycja przewijania dla każdej głównej sekcji (np. listy notatek) powinna być zachowana przy przełączaniu się między widokami.
- **Dostępność (WCAG):**
  - Minimalny rozmiar celu dotykowego dla każdego przycisku nawigacyjnego to `44x44px`.
  - Każdy przycisk musi mieć wyraźny `aria-label` opisujący jego funkcję.
  - Należy zapewnić pełne wsparcie dla nawigacji klawiaturą (`Tab`, `Enter`).
  - Aktywny link musi być jednoznacznie komunikowany technologiom asystującym (np. przez `aria-current="page"`).

## 5. Kryteria Sukcesu

- Zwiększona łatwość i szybkość dostępu do kluczowych sekcji aplikacji na urządzeniach mobilnych.
- Zmniejszone obciążenie poznawcze użytkownika poprzez stałą i widoczną nawigację.
- Utrzymanie 100% funkcjonalności i jakości doświadczenia na urządzeniach desktopowych.
- Pozytywna ocena w audytach dostępności (np. Lighthouse) dla widoków mobilnych.
