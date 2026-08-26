# Próbki nieustrukturyzowane

Wklej tu prawdziwe fragmenty tekstu, których obecny `parseStatementText`
(parser regułowy, rozdzielany separatorem) nie potrafi obsłużyć:

- `email-*.txt` — treść maila z powiadomieniem transakcyjnym z banku
- `pdf-copy-*.txt` — tekst skopiowany z wyciągu PDF (często połamane kolumny)
- `multiline-*.txt` — wpisy rozbite na kilka linii (np. eksport z appki bankowej)

Każdy plik = jedna próbka. Usuń placeholdery poniżej i zamień je na
prawdziwą treść (zamaskuj numer konta / dane osobowe, jeśli chcesz).

Format nazwy pliku nie ma znaczenia — skrypt czyta wszystkie `*.txt` w tym katalogu.
