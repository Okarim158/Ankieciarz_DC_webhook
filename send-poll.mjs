import { readFile } from 'node:fs/promises';

const webhookUrl = process.env.WEBHOOK_URL;
if (!webhookUrl) {
  console.error('❌ Brak WEBHOOK_URL — ustaw secret DISCORD_WEBHOOK_URL w repo (Settings → Secrets and variables → Actions)');
  process.exit(1);
}

const config = JSON.parse(await readFile('./poll.json', 'utf8'));

// Walidacja
if (!config.question || typeof config.question !== 'string') {
  throw new Error('poll.json: brakuje pola "question"');
}
if (!Array.isArray(config.options) || config.options.length < 2 || config.options.length > 10) {
  throw new Error('poll.json: "options" musi być tablicą 2-10 elementów');
}

// Format zgodny z Discord API: webhooks?wait=true zwraca info o wysłanej wiadomości
const url = `${webhookUrl}?wait=true`;
const payload = {
  poll: {
    question: { text: config.question },
    answers: config.options.map(text => ({ poll_media: { text } })),
    duration: config.duration_hours ?? 24,
    allow_multiselect: config.multiselect ?? false,
  },
};

// Opcjonalny tekst nad ankietą (np. ping roli).
// Webhook domyślnie nie pinguje ról nieoznaczonych jako "Mentionable",
// więc wyciągamy ID-ki ról i userów ręcznie do allowed_mentions.
if (config.content) {
  payload.content = config.content;

  const roleIds = [...config.content.matchAll(/<@&(\d+)>/g)].map(m => m[1]);
  const userIds = [...config.content.matchAll(/<@(\d+)>/g)].map(m => m[1]);

  const parse = [];
  if (config.content.includes('@everyone')) parse.push('everyone');
  if (config.content.includes('@here')) parse.push('here');

  payload.allowed_mentions = { parse, roles: roleIds, users: userIds };
}

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`❌ Błąd wysyłki (HTTP ${res.status}):`, body);
  process.exit(1);
}

console.log(`✅ Ankieta wysłana: "${config.question}" (${config.options.length} opcji)`);
