# Dokument wymagań produktu (PRD) - 10xNotes

## 1. Przegląd produktu

10xNotes to lekka aplikacja do porządkowania notatek ze spotkań. Użytkownik wkleja tekst w dowolnym języku, a system w oparciu o model LLM (poprzez API) generuje krótkie podsumowanie, informację o realizacji celów oraz proponuje etykietę. Generowanie działa bez rejestracji, ale zapisywanie, edycja i dostęp do kolekcji notatek wymaga konta.

## 2. Problem użytkownika

Zarządzanie podsumowywaniem notatek z wielu spotkań jest trudne i czasochłonne, co spowalnia podejmowanie decyzji i dalsze działania. Brak jednoznacznej informacji „czy cel został osiągnięty" utrudnia rozliczanie wyników spotkań (np. review).
Celem 10xNotes jest zapewnienie jednego źródła prawdy po spotkaniu (krótkie podsumowanie + status celu) oraz ułatwienie sposobu udostępniania podsumowań, aby przyspieszyć dalsze działania i ograniczyć błędną komunikację.

## 3. Wymagania funkcjonalne

1. Wklejanie treści

- Wklej tekst do 5000 znaków. Licznik znaków i blokada przekroczenia limitu z jasnym komunikatem.

2. Generowanie podsumowania

- Generowanie dostępne bez logowania (jako "test drive" funkcjonalności).
- Elementy podsumowania: streszczenie spotkania; status celów (osiągnięty/nieosiągnięty/nieokreślony); propozycja etykiety.
- Status „nieokreślony" ustawiamy tylko, gdy na podstawie treści nie da się obiektywnie stwierdzić wyniku; użytkownik może zmienić ręcznie.
- Jeśli nie da się jednoznacznie zaproponować etykiety, użytkownik może ustawić ją ręcznie.
- Po wygenerowaniu podsumowania system zachęca do rejestracji, aby zapisać notatkę.

3. Edycja i zapis

- Możliwość edycji pól podsumowania przed i po zapisaniu.
- Zapis obejmuje: oryginał treści, podsumowanie oraz datę spotkania (domyślnie dziś; edytowalna).

4. Etykiety i dostęp

- Etykieta jest wymagana i działa jak „katalog”.
- Dostęp do wszystkich notatek z daną etykietą można nadać odbiorcom jako tylko do odczytu; właściciel notatki edytuje.
- Nazwy etykiet są case-insensitive i unikalne w ramach konta.

5. Udostępnianie

- Publiczny link do podsumowania (tylko do odczytu) bez logowania; pełny wgląd (oryginał + podsumowanie) po zalogowaniu.
- Strona publiczna: noindex, bez podglądów OG; link można włączyć/wyłączyć w dowolnym momencie.

6. Lista i wyszukiwanie

- Sidebar z listą etykiet (tagów) umożliwiający szybkie przełączanie się między kolekcjami notatek.
- Kliknięcie etykiety w sidebarze filtruje listę do notatek z tą etykietą.
- Lista notatek z sortowaniem po dacie spotkania (najnowsze u góry), filtrami: zakres dat i status celów, oraz prostym wyszukiwaniem frazy po stronie interfejsu.
- System automatycznie obsługuje treści w dowolnym języku bez wyboru przez użytkownika.

7. Dostęp i logowanie

- Generowanie podsumowań dostępne bez rejestracji.
- Rejestracja/logowanie wymagane do: zapisu notatek, edycji, dodawania/edycji etykiet, dostępu do kolekcji zapisanych notatek oraz podglądu pełnej treści zapisanych notatek.
- Bez logowania dostępne: generowanie podsumowań + publiczne podsumowania zapisanych notatek (tylko do odczytu).
- Tylko właściciel może edytować notatki.
- Odbiorcy mają dostęp wyłącznie do odczytu do notatek z etykiet, do których zostali dodani.
- Link publiczny udostępnia jedynie podsumowanie, bez możliwości edycji.

8. Wymagania prawne i prywatność

- Minimalizacja danych osobowych (tylko e‑mail).
- Prawo do wglądu i usunięcia danych na żądanie użytkownika.
- Dane przechowywane zgodnie z RODO.
- Publiczne podsumowania: noindex, bez podglądów OG.
- Jasna informacja o tym, jakie dane są przetwarzane przez LLM.

9. Statystyki i monitoring

- Zbieranie informacji o liczbie wygenerowanych podsumowań per użytkownik (query do bazy danych)
- Pomiar czasu generowania podsumowania (logowanie czasu wywołania API)

## 4. Granice produktu

Poza zakresem MVP:

- Listy zadań/action items z przypisaniami, terminami i powiadomieniami.
- Integracje z innymi usługami (np. kalendarz, klient poczty e-mail).
- Alternatywne sposoby wprowadzania notatek (np. głosowe, z dokumentów .docx lub .pdf).
- Eksport notatek do formatów .pdf, .docx, .md.
- Zaawansowane wyszukiwanie.
- Historia wersji.
- Aplikacje mobilne.
- Tryb ciemny.

## 5. Historyjki użytkowników

ID: US-001
Tytuł: Dostęp do aplikacji i rejestracja
Opis: Jako nowy użytkownik chcę móc przetestować generowanie podsumowań bez rejestracji, a następnie założyć konto, aby zapisać notatki i mieć do nich dostęp.
Kryteria akceptacji:

- Każdy użytkownik może korzystać z generowania podsumowań bez rejestracji.
- Po wygenerowaniu podsumowania system wyświetla zachętę do rejestracji w celu zapisania notatki.
- Po rejestracji/logowaniu użytkownik uzyskuje dostęp do zapisu, edycji i kolekcji notatek.
- Bez logowania dostępne są: generowanie podsumowań + publiczne podsumowania zapisanych notatek (tylko do odczytu).
- Po zalogowaniu odbiorcy mają dostęp tylko do odczytu, a właściciel może edytować.

ID: US-002
Tytuł: Wklejanie notatek i limit treści
Opis: Jako użytkownik chcę wkleić treść notatek i mieć jasny limit znaków, aby uniknąć błędów przy zapisie.
Kryteria akceptacji:

- Widoczny licznik znaków w trakcie edycji.
- Przekroczenie 5000 znaków blokuje wysyłkę i wyświetla czytelny komunikat z sugestią podziału notatki.

ID: US-003
Tytuł: Generowanie podsumowania bez rejestracji
Opis: Jako nowy użytkownik chcę otrzymać krótkie podsumowanie bez konieczności rejestracji, aby przetestować wartość aplikacji przed utworzeniem konta.
Kryteria akceptacji:

- Generowanie działa bez logowania – każdy może wkleić tekst i wygenerować podsumowanie.
- Podsumowanie zawiera wszystkie wymagane elementy: streszczenie (50–200 słów), status celów (osiągnięty/nieosiągnięty/nieokreślony) oraz propozycję etykiety.
- Użytkownik widzi wskaźnik postępu (loader) podczas generowania; oczekiwany czas 3–10 s.
- Wynik jest propozycją – wszystkie pola są edytowalne przed zapisem (ale zapis wymaga rejestracji).
- Po wygenerowaniu system wyświetla wyraźną zachętę "Zaloguj się, aby zapisać notatkę" z łatwym dostępem do rejestracji.
- W razie problemu z API lub timeoutu (>30 s) system zachowuje wklejoną treść jako szkic i wyświetla komunikat z sugestią ponownej próby.
- System automatycznie obsługuje treści w dowolnym języku.

ID: US-004
Tytuł: Etykieta: propozycja i ręczna korekta
Opis: Jako użytkownik chcę, by system proponował etykietę, ale żebym mógł ją ręcznie ustawić lub utworzyć.
Kryteria akceptacji:

- Etykieta jest polem wymaganym do zapisu notatki.
- Nazwy etykiet są case-insensitive i unikalne w ramach konta.
- Etykieta działa jak „katalog” i służy do nadawania dostępu do grupy notatek.

ID: US-005
Tytuł: Ustawienie daty spotkania
Opis: Jako użytkownik chcę ustawić datę spotkania, której dotyczą notatki, aby poprawnie porządkować archiwum.
Kryteria akceptacji:

- Data domyślnie przyjmuje wartość „dzisiaj”.
- Datę można edytować przed i po zapisaniu.

ID: US-006
Tytuł: Edycja i zapis notatki
Opis: Jako użytkownik chcę edytować podsumowanie oraz zapisać notatkę wraz z oryginałem, aby zachować źródło prawdy.
Kryteria akceptacji:

- Edytowalne są wszystkie pola podsumowania.
- Zapis obejmuje oryginał treści, podsumowanie oraz datę spotkania.

ID: US-007
Tytuł: Publiczne udostępnienie podsumowania
Opis: Jako użytkownik chcę wygenerować link do podsumowania dla osób bez konta, aby łatwo dzielić się wynikami.
Kryteria akceptacji:

- Publiczny link pokazuje wyłącznie podsumowanie (tylko do odczytu), bez oryginału.
- Strona publiczna jest noindex i bez podglądów OG.
- Link można włączyć/wyłączyć w dowolnym momencie.

ID: US-008
Tytuł: Dostęp według etykiet (rola tylko do odczytu)
Opis: Jako właściciel chcę nadać odbiorcy dostęp do wszystkich notatek z daną etykietą, aby uprościć współdzielenie.
Kryteria akceptacji:

- Odbiorca widzi wszystkie notatki z przypisaną etykietą w trybie tylko do odczytu.
- Właściciel zachowuje prawo edycji i może w każdej chwili odebrać dostęp.
- Cofnięcie dostępu działa natychmiast (odbiorca traci widok listy i szczegółów notatek z tej etykiety).

ID: US-009
Tytuł: Lista, wyszukiwanie i nawigacja po etykietach
Opis: Jako użytkownik chcę szybko znaleźć notatkę i łatwo przełączać się między projektami za pomocą etykiet, aby sprawnie wrócić do ustaleń.
Kryteria akceptacji:

- Sidebar wyświetla listę wszystkich etykiet użytkownika.
- Kliknięcie etykiety w sidebarze filtruje listę notatek do wybranej etykiety.
- Lista jest domyślnie sortowana po dacie spotkania (najnowsze u góry).
- Filtry: zakres dat i status celów.
- Proste wyszukiwanie frazy w podsumowaniu po stronie interfejsu; automatyczna obsługa treści w dowolnym języku.

ID: US-010
Tytuł: Szczegóły notatki (pełny widok po zalogowaniu)
Opis: Jako zalogowany użytkownik chcę zobaczyć pełną treść notatki, aby mieć kontekst do decyzji.
Kryteria akceptacji:

- Widok zawiera oryginał treści oraz wszystkie pola podsumowania.
- Odbiorca (rola tylko do odczytu) nie widzi akcji edycji; właściciel ma możliwość edycji.

ID: US-011
Tytuł: Zmiana statusu celu
Opis: Jako właściciel notatki chcę zmienić status celów, aby odzwierciedlał rzeczywisty wynik.
Kryteria akceptacji:

- Dozwolone wartości: osiągnięty/nieosiągnięty/nieokreślony.
- Zmiana jest zapisywana i widoczna w szczegółach notatki.

ID: US-012
Tytuł: Zarządzanie linkiem publicznym
Opis: Jako właściciel chcę w dowolnym momencie wyłączyć publiczny link, aby zakończyć dostęp.
Kryteria akceptacji:

- Wyłączenie linku działa natychmiast.
- Wejście w wyłączony link wyświetla informację o braku dostępu.

ID: US-013
Tytuł: Usunięcie konta i danych
Opis: Jako użytkownik chcę móc usunąć swoje konto wraz ze wszystkimi danymi, aby mieć kontrolę nad swoimi informacjami osobowymi.
Kryteria akceptacji:

- W ustawieniach konta dostępna jest opcja usunięcia konta.
- Przed usunięciem system wymaga potwierdzenia (np. wpisanie adresu e-mail lub hasła).
- Usunięcie obejmuje: konto, wszystkie notatki, etykiety i nadane uprawnienia dostępu.
- Publiczne linki do usuniętych notatek zwracają błąd 404.
- Operacja jest nieodwracalna i wykonywana natychmiast.

## 6. Metryki sukcesu

1. Adopcja:

   - Średnio > 3 zapisane notatki dziennie na aktywnego użytkownika.

2. Wydajność generowania:
   - Średni czas generowania podsumowania < 30 s.
