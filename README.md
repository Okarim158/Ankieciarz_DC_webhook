# Daily Discord Poll — Cloudflare Workers

Niezawodna codzienna ankieta na Discordzie, postawiona na Cloudflare Workers Cron Triggers.

## Co i czemu

- **Cron Triggers** odpalają Worker według harmonogramu. Cloudflare deklaruje *near-real-time precision* — w praktyce w ciągu kilku sekund od ustalonej godziny. Bez peak-hours, bez "best effort" jak na GitHubie.
- **Free tier**: 100 000 requestów/dzień, cron triggers w cenie. Codzienna ankieta to **1 request dziennie** — nigdy w życiu nie wyjdziesz z free.
- **Bez serwera, bez maintenance, bez `npm install`** — Cloudflare uruchamia kod na swojej edge infrastrukturze.

## Setup (8 minut)

### 1. Konto Cloudflare

Wejdź na [dash.cloudflare.com](https://dash.cloudflare.com/) i zarejestruj się. Nic nie wymaga karty kredytowej dla Workers free tier.

### 2. Utwórz Worker

1. W menu po lewej: **Workers & Pages** → **Create application** → zakładka **Create Worker**.
2. **Worker name**: `daily-poll` (część URL-a, np. `daily-poll.twoj-user.workers.dev` — ale my i tak go nie będziemy używać).
3. **Deploy**.

### 3. Wklej kod

1. Po utworzeniu Workera kliknij **Edit code** (prawy górny).
2. Zaznacz całą zawartość pliku `worker.js` (po lewej, plik startowy) i zastąp ją zawartością z tego repo (plik `worker.js`).
3. **Save and deploy** (prawy górny).

### 4. Dodaj sekrety

1. Wróć do strony Workera (Back to dashboard).
2. **Settings** → **Variables and Secrets** → **Add**.
3. Pierwszy sekret:
   - **Type**: `Secret`
   - **Variable name**: `DISCORD_WEBHOOK_URL`
   - **Value**: pełny URL webhooka (`https://discord.com/api/webhooks/...`)
4. **Save and deploy**.
5. **Add** drugi sekret:
   - **Type**: `Secret`
   - **Variable name**: `TRIGGER_TOKEN`
   - **Value**: dowolny losowy string, najlepiej długi i nieoczywisty (np. wygeneruj z [random.org/strings](https://www.random.org/strings/) albo wymyśl typu `dziadekTakSilnyPies42!`). Ten token chroni endpoint testowy przed losowymi requestami z internetu.
6. **Save and deploy**.

### 5. Ustaw cron trigger

1. **Settings** → **Triggers** → sekcja **Cron Triggers** → **Add Cron Trigger**.
2. Wpisz wyrażenie cron (UTC, jak na GitHubie):
   - `45 8 * * *` → 10:45 PL latem / 9:45 PL zimą
   - `0 17 * * *` → 19:00 PL latem / 18:00 PL zimą
   - itd.
3. **Add trigger**.

### 6. Test ręczny

Wejdź w przeglądarce na:

```
https://daily-poll.TWOJ-USER.workers.dev/?token=TWOJ_TRIGGER_TOKEN
```

(URL Workera widzisz w sekcji **Settings → Domains & Routes**, albo w dashboardzie zaraz po wejściu w Workera.)

Jeśli wszystko gra — w przeglądarce zobaczysz `✅ Ankieta wysłana: "..."`, a na Discordzie pojawi się ankieta.

### 7. Test crona z dashboardu

Możesz też wymusić odpalenie scheduled handlera bez czekania na faktyczną godzinę:

1. Wejdź w Workera → **Settings** → **Triggers** → przy cron triggerze powinien być przycisk **Test** (lub w zakładce **Logs** "Trigger Cron Event").
2. Kliknij, Cloudflare odpali Worker tak jakby to był prawdziwy cron event.
3. Sprawdź **Logs** czy zobaczyłeś `✅ Ankieta wysłana: "..."`.

## Zmiana ankiety

Edytujesz obiekt `CONFIG` na górze pliku `worker.js`. **Save and deploy**. Następna ankieta używa nowej konfiguracji.

## Zmiana godziny

**Settings → Triggers → Cron Triggers** → edycja istniejącego triggera albo dodanie nowego.

Możesz mieć wiele triggerów na jeden Worker — np. ranny i wieczorny:
- `45 8 * * *` — 10:45 PL latem
- `0 17 * * *` — 19:00 PL latem

## Logi

**Workers & Pages** → wejdź w `daily-poll` → zakładka **Logs**. Tail-uje na żywo, widać każde odpalenie scheduled i ich wynik (`✅` albo error). Mocno przydatne do debugowania.

## Limity free tier

- **100 000 requestów/dzień** (1 codzienna ankieta = 0.001% limitu)
- **10 ms CPU time per request** (zmieścimy się w ~1-2 ms — sam fetch do Discorda)
- **Cron triggers**: 3 na konto (free), 30 na konto (paid). My używamy jednego.

## Architektura

```
[Cloudflare Cron Scheduler]
        ↓ (codziennie o ustalonej godzinie)
[Worker scheduled handler]
        ↓ (fetch z DISCORD_WEBHOOK_URL)
[Discord]
```

Worker wykonuje się tylko w momencie wywołania — przez resztę dnia nie zżera nic, nie istnieje, nie ma stanu. Idealnie pasuje do takich zadań.
