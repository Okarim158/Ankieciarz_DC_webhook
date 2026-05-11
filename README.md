# Daily Discord Poll

Codzienna ankieta na Discordzie, wysyłana automatycznie przez GitHub Actions. Zero hostingu, zero kosztów, zero maintenance.

## Co to robi

Codziennie o ustalonej godzinie GitHub Actions odpala skrypt, który POST-uje natywną ankietę Discorda przez webhook na wybrany kanał. Działa dopóki istnieje repo i webhook.

## Setup (5 minut)

### 1. Stwórz webhook na Discordzie

1. Wejdź na kanał, na którym mają się pojawiać ankiety.
2. Kliknij ikonkę koła zębatego obok nazwy kanału → **Integrations** → **Webhooks** → **New Webhook**.
3. Nazwij webhooka (np. "Daily Poll Bot"), opcjonalnie ustaw avatar.
4. Kliknij **Copy Webhook URL**. Skopiowany URL ma postać `https://discord.com/api/webhooks/<id>/<token>`.

> ⚠️ Ten URL = dostęp do wysyłania wiadomości na Twój kanał. Nie wrzucaj go do kodu, nie commituj, nie pokazuj nikomu.

### 2. Stwórz repo na GitHubie

1. Stwórz nowe repo (może być prywatne — limit minut na GitHub Actions jest hojny, codzienna ankieta zżera ~3 sekundy).
2. Skopiuj do niego wszystkie pliki z tego katalogu.
3. Commit + push.

### 3. Dodaj webhook URL jako sekret

W repo na GitHubie:

1. **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. **Name:** `DISCORD_WEBHOOK_URL`
3. **Value:** wklej skopiowany URL webhooka.
4. **Add secret**.

### 4. Ustaw godzinę

Otwórz `.github/workflows/daily-poll.yml` i edytuj linię z `cron`. Format: `'minuta godzina * * *'` w **UTC**.

| Czas w PL  | Lato (CEST = UTC+2) | Zima (CET = UTC+1) |
|------------|---------------------|--------------------|
| 8:00       | `0 6 * * *`         | `0 7 * * *`        |
| 9:00       | `0 7 * * *`         | `0 8 * * *`        |
| 10:00      | `0 8 * * *`         | `0 9 * * *`        |
| 12:00      | `0 10 * * *`        | `0 11 * * *`       |
| 20:00      | `0 18 * * *`        | `0 19 * * *`       |

Niestety GitHub Actions nie ogarnia stref czasowych — pojedynczy cron jest w UTC i nie zmienia się z DST. Dwa wyjścia:
- Zostaw jeden cron i raz na pół roku (przy zmianie czasu) edytuj godzinę.
- Albo dodaj dwa wpisy cron i zaakceptuj fakt, że przez kilka dni w roku (między DST a edycją) godzina będzie przesunięta.

### 5. Test

Idź do zakładki **Actions** w swoim repo → **Daily Poll** → **Run workflow** → przycisk **Run workflow**. Workflow odpali się ręcznie i jeśli wszystko gra — za kilkanaście sekund na Twoim kanale Discordzie pojawi się ankieta. Jak nie — w logu workflow zobaczysz co poszło nie tak.

## Zmiana pytania / opcji

Edytuj `poll.json`, commituj, pushuj. Następna ankieta od razu używa nowej konfiguracji.

```json
{
  "content": "<@&1491323320774430880>",
  "question": "Twoje pytanie",
  "options": ["Opcja 1", "Opcja 2", "Opcja 3"],
  "duration_hours": 24,
  "multiselect": false
}
```

- `content` *(opcjonalne)*: tekst który pojawi się nad ankietą. Możesz tu wkleić ping roli (`<@&ID_ROLI>`), pojedynczego usera (`<@ID_USERA>`), albo zwykły tekst typu *"Cześć, nowa ankieta!"*. Skrypt automatycznie wyciąga ID-ki i pinguje. Działa też `@everyone` i `@here`. Jeśli pomijasz to pole, ankieta idzie sucho bez tekstu.
- `options`: 2-10 sztuk, każda do 55 znaków.
- `duration_hours`: 1-768 (max tydzień).
- `multiselect`: czy można wybrać więcej niż jedną opcję.

### Jak skopiować ID roli z Discorda

Najprościej: na serwerze napisz `\@nazwa-roli` (z backslashem) → Discord pokaże raw text `<@&123456789>`, skopiuj. Albo włącz Developer Mode (Ustawienia użytkownika → Advanced → Developer Mode), potem PPM na rolę → Copy Role ID — ale wtedy musisz sam owinąć w `<@&...>`.

## Uwaga o niezawodności cronu

GitHub Actions cron jest *best effort* — może być opóźniony o 5-30 minut przy dużym obciążeniu ich infrastruktury. W skrajnych przypadkach (rzadko) pojedyncze odpalenie może zostać pominięte. Dla codziennej ankiety w stylu "morning check-in" to bez znaczenia. Dla rzeczy time-critical (np. ankieta dokładnie 5 minut przed eventem) — to nie jest właściwe narzędzie.

## Pliki

```
.
├── .github/workflows/daily-poll.yml   # cron + odpalenie skryptu
├── send-poll.mjs                       # logika wysyłki (Node 20, zero zależności)
├── poll.json                           # treść ankiety
└── README.md                           # ten plik
```
