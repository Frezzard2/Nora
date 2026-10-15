import "server-only";
import { classifyEcho } from "./echo";
import { getConversation, update, wasSentByUs } from "./store";

/**
 * A fiók kimenő üzenetének visszhangja.
 *
 * A Meta minden kimenő üzenetet visszaküld `is_echo` jelzéssel. Eddig mindet
 * eldobtuk — ezzel együtt azt is, amit az ügyfél KÉZZEL írt az Instagramból.
 * Pedig pont az a legértékesebb: abból derül ki, hogy egy átadott beszélgetést
 * megválaszolt-e valaki, és az ő szavai a legjobb minta a bot számára.
 *
 * FONTOS: ez az ág SOHA nem generál és nem küld választ. Csak tárol. Enélkül
 * visszatérne a régi hiba, amikor a bot a saját üzenetére válaszolt.
 */
export async function handleEcho(partnerId: string, text: string): Promise<void> {
  const conv = await getConversation(partnerId);

  if (conv.ignored) {
    console.info(`[visszhang] ${partnerId}: figyelmen kívül hagyott fiók, nem tároljuk.`);
    return;
  }

  const kind = classifyEcho({
    text,
    messages: conv.messages,
    sentByUs: await wasSentByUs(text),
  });

  if (kind === "sajat") {
    console.info("[visszhang] A bot saját üzenete, már tárolva — kihagyva.");
    return;
  }
  if (kind === "ismeretlen") {
    console.info(`[visszhang] ${partnerId}: nincs ilyen beszélgetés, kimenő üzenetből nem hozunk létre újat.`);
    return;
  }

  const at = Date.now();
  await update(partnerId, (c) => ({
    ...c,
    messages: [...c.messages, { role: "assistant" as const, text, at, by: "human" as const }],
    lastActivity: at,
  }));
  console.info(`[visszhang] ${partnerId}: EMBERI válasz eltárolva (${text.length} karakter).`);
}
