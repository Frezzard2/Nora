import "server-only";
import rawConfig from "@/config/client.json";
import { sendMessage } from "./instagram";
import { generateReply, type IncomingMessage } from "./reply-engine";
import { bump, isBotEnabled, update, type StoredMessage } from "./store";
import type { NoraConfig } from "./types";

/** Egy ügyfél, egy konfiguráció — a kérdőív exportált JSON-ja. */
const CONFIG = rawConfig as unknown as NoraConfig;

/** Beszélgetésenkénti napi válaszkorlát: egy hibás kör ne égessen el pénzt. */
const DAILY_LIMIT = Number(process.env.MAX_REPLIES_PER_DAY ?? 20);

const HANDOVER_FALLBACK = "Ezt inkább személyesen válaszoljuk meg — hamarosan jelentkezünk.";

const toIncoming = (m: StoredMessage): IncomingMessage => ({
  source: "instagram",
  role: m.role,
  text: m.text,
});

/**
 * Egy bejövő DM teljes feldolgozása: tárolás, döntés a válaszról, küldés.
 * A hívó (webhook) ezt már a 200-as válasz után futtatja.
 */
export async function handleMessage(senderId: string, text: string): Promise<void> {
  const conv = await update(senderId, (c) => ({
    ...c,
    messages: [...c.messages, { role: "user" as const, text, at: Date.now() }],
    lastActivity: Date.now(),
  }));

  if (conv.handedOff) return;
  if (!conv.botEnabled) return;
  if (!(await isBotEnabled())) {
    console.info("[nora] Globális vészkapcsoló ki van kapcsolva — nincs válasz.");
    return;
  }

  const day = new Date().toISOString().slice(0, 10);
  if ((await bump(`reply:${senderId}:${day}`, 60 * 60 * 24)) > DAILY_LIMIT) {
    console.warn(`[nora] Napi válaszkorlát (${DAILY_LIMIT}) elérve ezen a beszélgetésen.`);
    return;
  }

  let reply;
  try {
    reply = await generateReply(CONFIG, conv.messages.map(toIncoming));
  } catch (err) {
    // a kulcsot az SDK nem teszi a hibába, de a stacket se logoljuk ki
    console.error("[nora] Válaszgenerálás sikertelen:", err instanceof Error ? err.message : err);
    return;
  }

  const body = reply.text.trim() || (reply.handover ? HANDOVER_FALLBACK : "");
  if (body) await sendMessage(senderId, body);

  await update(senderId, (c) => ({
    ...c,
    // átadás után a bot hallgat, a kapcsolót az admin felületen lehet visszatenni
    handedOff: c.handedOff || reply.handover,
    messages: body
      ? [...c.messages, { role: "assistant" as const, text: body, at: Date.now() }]
      : c.messages,
    lastActivity: Date.now(),
    tokens: {
      input: c.tokens.input + (reply.usage?.inputTokens ?? 0),
      output: c.tokens.output + (reply.usage?.outputTokens ?? 0),
    },
    costUsd: c.costUsd + (reply.usage?.costUsd ?? 0),
  }));
}
