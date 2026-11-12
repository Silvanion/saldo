# Polityka bezpieczeństwa

## Zgłaszanie podatności

**Nie zgłaszaj podatności jako publicznego issue.** Użyj prywatnego zgłoszenia GitHub:
<https://github.com/Silvanion/saldo/security/advisories/new>

Podaj: wersję aplikacji i platformę, kroki odtworzenia, wpływ (jakie dane lub funkcje są zagrożone) oraz, jeśli to możliwe, propozycję poprawki. Nie dołączaj prawdziwych danych finansowych.

Projekt rozwija jedna osoba, więc nie obiecuję SLA. Dołożę starań, by potwierdzić zgłoszenie w ciągu 7 dni i poinformować o planie poprawki. Zgłaszającym, którzy sobie tego życzą, wpiszę podziękowanie w notatkach wydania.

## Wspierane wersje

Poprawki bezpieczeństwa trafiają do najnowszego wydania. Starsze wersje nie są łatane.

## Zakres

W zakresie: aplikacja Saldo (web/PWA i desktop), jej serwer lokalny, mechanizm szyfrowania profili, reguły Firestore w repozytorium, skrypty wydawnicze (CI).
Poza zakresem: podatności w usługach zewnętrznych (Google/Firebase, GitHub, dostawcy AI) — zgłaszaj je u ich operatorów.

## Znane ograniczenia

Aktualna lista ograniczeń modelu bezpieczeństwa znajduje się w [SECURITY_AUTH_PRIVACY.md](SECURITY_AUTH_PRIVACY.md) (sekcja „Znane ograniczenia”).
Ten dokument nie zastępuje zewnętrznego audytu bezpieczeństwa.
