import { after } from "next/server";
import { handleMessage } from "@/lib/handleMessage";
import { verifySignature } from "@/lib/signature";
import { firstDelivery, noteIds, noteUnhandled } from "@/lib/store";

export const runtime = "nodejs";

/** A Meta ellenőrző hívása a webhook beállításakor. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = process.env.IG_VERIFY_TOKEN;

  if (token && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === token) {
    // a challenge-et NYERS szövegként kell visszaadni, nem JSON-ként
    return new Response(q.get("hub.challenge") ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new Response("Forbidden", { status: 403 });
}

type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { mid?: string; text?: string; is_echo?: boolean };
};
type Entry = {
  /** annak a fióknak az azonosítója, amelyre az esemény érkezett */
  id?: string;
  messaging?: MessagingEvent[];
  /** a Meta dashboard „Send to Server" tesztje ebben az alakban küld */
  changes?: { field?: string; value?: MessagingEvent }[];
};
type Payload = { entry?: Entry[] };

/**
 * Egy érték szerkezete: kulcsok és típusok, a tartalom nélkül. Így a beállítás
 * közben látjuk, milyen alakban küld a Meta, anélkül hogy ügyfél-üzenet kerülne
 * a naplóba vagy a tárolóba.
 */
function shapeOf(value: unknown, depth = 0): unknown {
  if (depth > 5) return "…";
  if (Array.isArray(value)) return value.length ? [shapeOf(value[0], depth + 1)] : [];
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, shapeOf(v, depth + 1)]),
    );
  }
  return typeof value;
}

/**
 * A valódi Instagram-üzenetek az `entry[].messaging` tömbben jönnek, a Meta
 * dashboard teszt-gombja viszont `entry[].changes[].value` alakban. Mindkettőt
 * kezeljük, különben a dashboard tesztje csendben semmit nem csinál.
 */
function eventsOf(entry: Entry): MessagingEvent[] {
  const fromChanges = (entry.changes ?? [])
    .filter((c) => c.field === "messages" && c.value)
    .map((c) => c.value as MessagingEvent);

  return [...(entry.messaging ?? []), ...fromChanges];
}

export async function POST(req: Request) {
  // a HMAC a nyers bytes-okon számol, ezért itt még nem parse-olunk
  const raw = Buffer.from(await req.arrayBuffer());

  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), process.env.IG_APP_SECRET ?? "")) {
    console.warn("[webhook] Érvénytelen aláírás — a kérés elutasítva.");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: Payload;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  // A Meta újraküld, ha lassú a válasz: azonnal 200, a feldolgozás utána fut.
  after(() => process_(payload));
  return new Response("EVENT_RECEIVED", { status: 200 });
}

async function process_(payload: Payload) {
  // egy payloadban több entry, egy entryben több esemény is lehet
  for (const entry of payload.entry ?? []) {
    const events = eventsOf(entry);
    if (!events.length) {
      const shape = shapeOf(entry);
      console.info("[webhook] Feldolgozható esemény nélküli entry. Szerkezet:", JSON.stringify(shape));
      await noteUnhandled(shape);
    }

    for (const event of events) {
      const msg = event.message;
      const senderId = event.sender?.id;
      if (!msg || !senderId) continue;

      // a saját visszhangzó üzenetünk — nélküle a bot magának válaszolna
      if (msg.is_echo) {
        console.info("[webhook] Saját visszhangzó üzenet (is_echo), kihagyva.");
        continue;
      }

      /**
       * A gyakorlatban a Meta is_echo nélkül is visszaküldi a saját kimenő
       * üzenetünket: ilyenkor a küldő annak a fióknak az azonosítója, amelyre
       * az esemény érkezett. Enélkül a bot a saját válaszára válaszolt.
       * Csak akkor szűrünk, ha egyeznek — ha az entry.id hiányzik vagy más
       * alakú, inkább feldolgozzuk, mint hogy minden üzenetet eldobjunk.
       */
      if (entry.id && senderId === entry.id) {
        console.info("[webhook] Saját kimenő üzenet (küldő = a fiók), kihagyva.");
        continue;
      }

      const text = msg.text?.trim();
      // ponytail: csak szöveget kezelünk; kép/hang/sticker esetén nincs válasz
      if (!text || !msg.mid) {
        console.info(`[webhook] Nem szöveges üzenet ${senderId}-től, kihagyva.`);
        continue;
      }

      // csak opak azonosítók, üzenet-tartalom nélkül — a szűrés finomításához
      await noteIds({ entry: entry.id, sender: senderId, recipient: event.recipient?.id });

      if (!(await firstDelivery(msg.mid))) {
        console.info(`[webhook] Már feldolgozott üzenet (${msg.mid}), kihagyva.`);
        continue;
      }

      try {
        await handleMessage(senderId, text);
      } catch (err) {
        console.error("[webhook] Feldolgozási hiba:", err instanceof Error ? err.message : err);
      }
    }
  }
}
