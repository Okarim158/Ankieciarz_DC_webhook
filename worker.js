// =============================================================================
// Konfiguracja ankiety
// =============================================================================
const CONFIG = {
  content: "<@&1512014354604757053>",
  question: "Among us 20?",
  optionTexts: ["Będę", "Nie będę", "Nie wiem", "Będę o 21"],
  duration_hours: 24,
  multiselect: false,
};

// =============================================================================
// Pula emoji do losowej rotacji
//
// Discord wymaga aby pole `animated` zgadzało się z rzeczywistym typem emoji,
// inaczej leci HTTP 400. Jeśli któryś poll padnie z błędem, w logach Cloudflare
// zobaczysz wylosowane ID — przenieś tego "winowajcę" z `static` do `animated`
// (lub odwrotnie). Iteracyjnie się to wyczyści.
//
// Trick na sprawdzenie: na Discordzie napisz `\:nazwa_emoji:` (z backslashem).
// `<a:...>` = animowane, `<:...>` = statyczne.
// =============================================================================
const EMOJI_POOL = {
  static: [
    "1497602937248288779", // pepesadamongus
    "1497602977836306573", // thickandsussy
    "1497602531122221249",
    "1507695460243079198",
    "1507696719805026397",
    "1497602533663969330",
    "1497602932089294988",
    "1497602535610126506",
    "1497602941685727503",
    "1497602945783562291",
    "1497602949034021036",
  ],
  animated: [
    "1497602951693336576", // amonguskiss
    "1497602968005120040", // amongusinspace
    "1497602544820813854",
    "1497602953350217818",
    "1497602943837409452",
    "1497602538071920672",
    "1497602981850517615",
    "1497602974032334898",
    "1497602969561202780",
    "1497602528701976778",
    "1497602960379609181",
  ],
};

// =============================================================================

function pickRandomEmojis(pool, count) {
  const all = [
    ...pool.static.map(id => ({ id, animated: false })),
    ...pool.animated.map(id => ({ id, animated: true })),
  ];
  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, count);
}

async function sendPoll(webhookUrl) {
  if (!webhookUrl) {
    throw new Error('Brak DISCORD_WEBHOOK_URL w secrets Workera');
  }

  const emojis = pickRandomEmojis(EMOJI_POOL, CONFIG.optionTexts.length);

  const answers = CONFIG.optionTexts.map((text, i) => ({
    poll_media: {
      text,
      emoji: {
        id: emojis[i].id,
        name: "e", // placeholder — Discord nie wymaga rzeczywistej nazwy dla custom emoji
        animated: emojis[i].animated,
      },
    },
  }));

  const payload = {
    poll: {
      question: { text: CONFIG.question },
      answers,
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
    console.error('Wylosowane emoji:', emojis.map(e => `${e.id} (animated: ${e.animated})`).join(', '));
    console.error('PAYLOAD:', JSON.stringify(payload, null, 2));
    throw new Error(`Discord HTTP ${res.status}: ${body}`);
  }

  console.log(`Wylosowane emoji: ${emojis.map(e => e.id).join(', ')}`);
  return res.json();
}

export default {
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
