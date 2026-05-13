// =============================================================================
// Konfiguracja ankiety — edytuj poniżej, potem Save and Deploy w dashboardzie
// =============================================================================
const CONFIG = {
  content: "<@&1491323320774430880>",
  question: "Among us o 19?",
  options: [
    "<a:90800amonguskiss:1497602951693336576> Będę",
    "<a:76523pepesadamongus:1497602937248288779> Nie będę",
    "<a:58428thickandsussy:1497602977836306573> Będę o 20",
    "<a:29950amongusinspace:1497602968005120040> Będę o 21",
  ],
  duration_hours: 24,
  multiselect: false,
};
// =============================================================================

function parseOption(raw) {
  const match = raw.match(/^<(a)?:(\w+):(\d+)>\s*(.*)$/);
  if (match) {
    const [, animated, name, id, text] = match;
    return {
      poll_media: {
        text: (text.trim() || name).slice(0, 55),
        emoji: { id, name, animated: Boolean(animated) },
      },
    };
  }
  return { poll_media: { text: raw } };
}

async function sendPoll(webhookUrl) {
  if (!webhookUrl) {
    throw new Error('Brak DISCORD_WEBHOOK_URL w secrets Workera');
  }

  const payload = {
    poll: {
      question: { text: CONFIG.question },
      answers: CONFIG.options.map(parseOption),
      duration: CONFIG.duration_hours ?? 24,
      allow_multiselect: CONFIG.multiselect ?? false,
    },
  };

  if (CONFIG.content) {
    payload.content = CONFIG.content;
    const roleIds = [...CONFIG.content.matchAll(/<@&(\d+)>/g)].map(m => m[1]);
    const userIds = [...CONFIG.content.matchAll(/<@(\d+)>/g)].map(m => m[1]);
    const parse = [];
    if (CONFIG.content.includes('@everyone')) parse.push('everyone');
    if (CONFIG.content.includes('@here')) parse.push('here');
    payload.allowed_mentions = { parse, roles: roleIds, users: userIds };
  }

  const res = await fetch(`${webhookUrl}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord HTTP ${res.status}: ${body}`);
  }

  return res.json();
}

export default {
  // Cron handler — odpala się według harmonogramu ustawionego w Triggers w dashboardzie
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        await sendPoll(env.DISCORD_WEBHOOK_URL);
        console.log(`✅ Ankieta wysłana: "${CONFIG.question}"`);
      } catch (err) {
        console.error('❌ Błąd wysyłki:', err.message);
        throw err;
      }
    })());
  },

  // HTTP handler — do ręcznego testowania. Wymaga ?token=... żeby randomy nie spamowały.
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (!env.TRIGGER_TOKEN || token !== env.TRIGGER_TOKEN) {
      return new Response('Unauthorized', { status: 401 });
    }
    try {
      await sendPoll(env.DISCORD_WEBHOOK_URL);
      return new Response(`✅ Ankieta wysłana: "${CONFIG.question}"`, { status: 200 });
    } catch (err) {
      return new Response(`❌ Błąd: ${err.message}`, { status: 500 });
    }
  },
};
