import "server-only";
import { chunk } from "./chunk.ts";
import { bump, rememberSent } from "./store.ts";

/**
 * A Graph API verziója — egyetlen helyen, a DM-ek és a kommentek is ezt használják.
 * A Meta dokumentációja jelenleg v25.0-t ír a példáiban; a v23.0 továbbra is él, és
 * a használt végpontok alakja nem változott. Token-megújításkor érdemes feljebb vinni.
 */
export const GRAPH_VERSION = "v23.0";

const HOST = `https://graph.instagram.com/${GRAPH_VERSION}`;
const ENDPOINT = `${HOST}/me/messages`;

/** Az Instagram API kb. 200 hívás/óra/fiók — ez alatt maradunk. */
const HOURLY_LIMIT = Number(process.env.IG_MAX_SENDS_PER_HOUR ?? 180);

type MetaError = { error?: { message?: string; code?: number; error_subcode?: number } };

/** true, ha minden darab kiment. A hívó eldöntheti, feljegyzi-e elküldöttként. */
export async function sendMessage(recipientId: string, text: string): Promise<boolean> {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) {
    console.error("[instagram] IG_ACCESS_TOKEN nincs beállítva — az üzenet nem ment ki.");
    return false;
  }

  const parts = chunk(text);
  for (const [i, part] of parts.entries()) {
    // óránkénti globális korlát: a számláló a futó UTC-órához tartozik
    const hour = new Date().toISOString().slice(0, 13);
    if ((await bump(`send:${hour}`, 3600)) > HOURLY_LIMIT) {
      console.error(
        `[instagram] Óránkénti küldési korlát (${HOURLY_LIMIT}) elérve — az üzenet nem ment ki.`,
      );
      return false;
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
        return false;
      }

      console.info(
        `[instagram] Elküldve ${i + 1}/${parts.length} (${part.length} karakter) → ${recipientId}`,
      );
    } catch (err) {
      console.error(
        "[instagram] Hálózati hiba küldéskor:",
        err instanceof Error ? err.message : err,
      );
      return false;
    }
  }
  return true;
}

/**
 * A küldő Instagram felhasználóneve az azonosítója alapján, az admin felülethez.
 * A webhook csak opak azonosítót ad, ebből az ügyfél nem ismeri fel, ki írt.
 *
 * GET /<IGSID>?fields=username — instagram_business_basic +
 * instagram_business_manage_messages jogosultsággal.
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/user-profile
 *
 * Üres sztringet ad vissza, ha nem sikerült: a hívó ezt elmentve nem próbálja
 * újra minden üzenetnél.
 */
export async function fetchUsername(igsid: string): Promise<string> {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) return "";

  try {
    const res = await fetch(`${HOST}/${encodeURIComponent(igsid)}?fields=username`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as MetaError;
      console.warn(
        `[instagram] A felhasználónév nem kérhető le (HTTP ${res.status}): ${
          body.error?.message ?? "nincs hibaleírás"
        }`,
      );
      return "";
    }
    const body = (await res.json()) as { username?: string };
    return body.username ?? "";
  } catch (err) {
    console.warn(
      "[instagram] Hálózati hiba felhasználónév-lekéréskor:",
      err instanceof Error ? err.message : err,
    );
    return "";
  }
}

/**
 * A tokenhez tartozó fiók. Az admin felületen ebből derül ki, hogy a webhook
 * ugyanarra a fiókra küld-e eseményt, mint amelyikhez a tokenünk van — ha nem,
 * idegen fiók üzeneteit dolgoznánk fel (AI-költséggel), küldeni pedig nem tudnánk.
 */
export async function fetchOwnAccount(): Promise<{ id: string; username: string } | null> {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(`${HOST}/me?fields=id,username`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { id?: string; username?: string };
    return body.id && body.username ? { id: body.id, username: body.username } : null;
  } catch {
    return null;
  }
}
