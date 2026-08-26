# Eksperyment: czy lokalne AI jest tego warte

Ten katalog nie jest częścią aplikacji — to jednorazowa ewaluacja, która ma
rozstrzygnąć, gdzie (jeśli w ogóle) lokalne AI daje przewagę nad silnikiem
regułowym, który już działa w `src/services/localParsers.ts` i
`src/utils/categories.ts`.

Dwa osobne pytania, dwa osobne skrypty:

## 1. Kategoryzacja — `categorization-eval.ts`

Pytanie: czy model kategoryzuje polskie deskryptory bankowe lepiej niż
19-wpisowy słownik w `autoCategorizeTransaction`?

**Krok 1** — zbierz dane:

```bash
cp experiments/ai-eval/data/descriptors.csv.example experiments/ai-eval/data/descriptors.csv
```

`descriptors.csv` jest w `.gitignore` — prawdziwe dane bankowe nigdy nie
trafią do repozytorium. Otwórz plik, usuń wiersze zaczynające się od `#`
i wklej ~100-150 prawdziwych deskryptorów ze swojego wyciągu z ręcznie
przypisaną kategorią, np.:

```csv
descriptor,expected_category
PAYU*ALLEGRO 12345 WARSZAWA PL,Żywność
ZABKA Z7841 K.1 WARSZAWA PL,Żywność
TPAY.COM/RATY/9284,Raty
```

Możesz zamaskować numery kont/kart — liczy się sam opis transakcji.

**Krok 2** — pobierz model (jeśli jeszcze nie masz):

```bash
ollama pull qwen2.5:7b
```

**Krok 3** — uruchom:

```bash
npx tsx experiments/ai-eval/categorization-eval.ts qwen2.5:7b
```

Wynik: dokładność reguł (na zimnym starcie, bez reguł użytkownika) vs
dokładność modelu, plus lista rozbieżności w
`data/categorization-report.md`.

## 2. Ekstrakcja z tekstu nieustrukturyzowanego — `extraction-eval.ts`

Pytanie: czy model wyciąga transakcje z maila bankowego / tekstu
skopiowanego z PDF-a, czego regułowy parser (rozdzielany separatorem) z
definicji nie potrafi?

**Krok 1** — skopiuj przykłady i wklej prawdziwą treść:

```bash
cd experiments/ai-eval/data/unstructured-samples
cp email-1.txt.example email-1.txt
cp pdf-copy-1.txt.example pdf-copy-1.txt
```

Pliki `*.txt` są w `.gitignore` — dodaj ich tyle, ile masz próbek.

**Krok 2** — uruchom:

```bash
npx tsx experiments/ai-eval/extraction-eval.ts qwen2.5:7b
```

Ten skrypt nie liczy automatycznego wyniku procentowego — wypisuje obok
siebie to, co wyciągnęły reguły, i to, co wyciągnął model. Oceń ręcznie,
patrząc na `data/extraction-report.md`.

## Jak czytać wynik

- **Kategoryzacja**: jeśli różnica jest poniżej ~10 pkt proc., reguły +
  ewentualnie rozszerzony słownik deskryptorów prawdopodobnie wystarczą —
  ten obszar nie uzasadnia kosztu Ollamy.
- **Ekstrakcja**: tu spodziewam się wyraźnej przewagi modelu, bo reguły
  dają zero na formacie, którego nie potrafią sparsować z definicji. Jeśli
  model faktycznie wyciąga sensowne transakcje z maila/PDF-a, to jest
  najsilniejszy argument za lokalnym AI w aplikacji.

## Uwaga: Ollama nie jest w pełni deterministyczna

Nawet przy `temperature: 0` ten sam prompt może dać różny wynik między
uruchomieniami (np. raz poprawna odpowiedź, raz pusty obiekt `{}`). Jeśli
wynik jest blisko granicy (różnica kilku punktów procentowych), uruchom
skrypt jeszcze raz zamiast ufać pojedynczemu przebiegowi.

## Co dalej

Wyniki wklej z powrotem do rozmowy — na ich podstawie decydujemy, czy i
gdzie lokalne AI wchodzi do aplikacji (patrz Etap 2 planu: panel wniosków
zamiast czatu). Ten katalog można potem usunąć — nic z niego nie jest
importowane przez `src/`.
