import "server-only";
import { chunk } from "./chunk.ts";
import { bump, rememberSent } from "./store.ts";

/** A Graph API verziója — egyetlen helyen. */
export const GRAPH_VERSION = "v23.0";

const ENDPOINT = `https://graph.instagram.com/${GRAPH_VERSION}/me/messages`;

/** Az Instagram API kb. 200 hívás/óra/fiók — ez alatt maradunk. */
const HOURLY_LIMIT = Number(process.env.IG_MAX_SENDS_PER_HOUR ?? 180);

type MetaError = { error?: { message?: string; code?: number; error_subcode?: number } };

export async function sendMessage(recipientId: string, text: string): Promise<void> {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) {
    console.error("[instagram] IG_ACCESS_TOKEN nincs beállítva — az üzenet nem ment ki.");
    return;
  }

  const parts = chunk(text);
  for (const [i, part] of parts.entries()) {
    // óránkénti globális korlát: a számláló a futó UTC-órához tartozik
    const hour = new Date().toISOString().slice(0, 13);
    if ((await bump(`send:${hour}`, 3600)) > HOURLY_LIMIT) {
      console.error(
        `[instagram] Óránkénti küldési korlát (${HOURLY_LIMIT}) elérve — az üzenet nem ment ki.`,
      );
      return;
    }

    // a visszhang akár a küldés válasza előtt megérkezhet, ezért előbb jegyezzük fel
    await rememberSent(part);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: recipientId }, message: { text: part } }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as MetaError;
        const e = body.error ?? {};
        // a tokent soha nem logoljuk, csak amit a Meta visszaküldött
        console.error(
          `[instagram] Küldés sikertelen (HTTP ${res.status}): ${
            e.message ?? "nincs hibaleírás"
          }${e.code ? ` [code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""}]` : ""}`,
        );
        return;
      }

      console.info(
        `[instagram] Elküldve ${i + 1}/${parts.length} (${part.length} karakter) → ${recipientId}`,
      );
    } catch (err) {
      console.error(
        "[instagram] Hálózati hiba küldéskor:",
        err instanceof Error ? err.message : err,
      );
      return;
    }
  }
}
