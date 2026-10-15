import { after } from "next/server";
import { handleComment } from "@/lib/handleComment";
import { handleEcho } from "@/lib/handleEcho";
import { handleMessage } from "@/lib/handleMessage";
import { verifySignature } from "@/lib/signature";
import {
  firstDelivery,
  isOwnComment,
  isSelfId,
  markSelfId,
  noteEntryId,
  noteIds,
  noteUnhandled,
  wasSentByUs,
} from "@/lib/store";

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
/**
 * A `comments` webhook-mező alakja a Meta dokumentációja szerint:
 * https://developers.facebook.com/docs/instagram-platform/webhooks
 */
type CommentEvent = {
  /**
   * A komment azonosítója. A Meta webhook-példája `comment_id`-t mutat, a
   * gyakorlatban `id` is érkezik — mindkettőt elfogadjuk, mert ezen a projekten
   * már egyszer elcsúszott a dashboard-teszt és a valódi esemény alakja.
   */
  comment_id?: string;
  id?: string;
  /** a szülő komment azonosítója, ha ez egy válasz-komment */
  parent_id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string; media_product_type?: string };
};

type Entry = {
  /** annak a fióknak az azonosítója, amelyre az esemény érkezett */
  id?: string;
  messaging?: MessagingEvent[];
  /** a Meta dashboard „Send to Server" tesztje ebben az alakban küld */
  changes?: { field?: string; value?: MessagingEvent & CommentEvent }[];
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
    .filter((c) => (c.field === "messages" || c.field === "message_echoes") && c.value)
    .map((c) => c.value as MessagingEvent);

  return [...(entry.messaging ?? []), ...fromChanges];
}

/** A `comments` mező eseményei (komment és válasz-komment egyaránt). */
function commentsOf(entry: Entry): CommentEvent[] {
  return (entry.changes ?? [])
    .filter((c) => c.field === "comments" && c.value)
    .map((c) => c.value as CommentEvent);
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
  /**
   * Egy Meta apphoz több Instagram fiók is köthető, és akkor mindegyik
   * eseménye ugyanerre a webhookra jön. Nekünk egy tokenünk van, ezért a
   * másik fiók üzeneteire hiába generálnánk választ: a küldés elhasalna,
   * az AI-hívást viszont kifizetnénk. Ezért csak a sajátunkat dolgozzuk fel.
   */
  const ownAccount = process.env.IG_ACCOUNT_ID?.trim();

  // egy payloadban több entry, egy entryben több esemény is lehet
  for (const entry of payload.entry ?? []) {
    if (entry.id) await noteEntryId(entry.id);

    if (ownAccount && entry.id && entry.id !== ownAccount) {
      console.info(`[webhook] Másik fiók eseménye (${entry.id}), kihagyva.`);
      continue;
    }

    const events = eventsOf(entry);
    const comments = commentsOf(entry);
    if (!events.length && !comments.length) {
      const shape = shapeOf(entry);
      console.info("[webhook] Feldolgozható esemény nélküli entry. Szerkezet:", JSON.stringify(shape));
      await noteUnhandled(shape);
    }

    for (const event of events) {
      const msg = event.message;
      const senderId = event.sender?.id;
      if (!msg || !senderId) continue;

      const text = msg.text?.trim();

      /**
       * A fiók KIMENŐ üzenete, visszhangként. Lehet a boté (azt már tároltuk),
       * vagy amit az ügyfél kézzel írt az Instagramból — az utóbbit eltesszük,
       * mert abból derül ki, hogy egy átadott beszélgetést megválaszoltak-e.
       *
       * Visszhangnál a beszélgetés partnere a CÍMZETT, nem a küldő: a küldő
       * maga a fiók. A handleEcho SOHA nem generál és nem küld választ.
       */
      if (msg.is_echo) {
        const partnerId = event.recipient?.id;
        if (!partnerId || !text || !msg.mid) {
          console.info("[webhook] Hiányos vagy nem szöveges visszhang, kihagyva.");
          continue;
        }
        if (!(await firstDelivery(msg.mid))) {
          console.info(`[webhook] Már feldolgozott visszhang (${msg.mid}), kihagyva.`);
          continue;
        }
        try {
          await handleEcho(partnerId, text);
        } catch (err) {
          console.error(
            "[webhook] Visszhang-feldolgozási hiba:",
            err instanceof Error ? err.message : err,
          );
        }
        continue;
      }

      // a visszhangból korábban megtanult saját küldő-azonosító
      if (await isSelfId(senderId)) {
        console.info("[webhook] Saját kimenő üzenet (ismert küldő-azonosító), kihagyva.");
        continue;
      }

      // ponytail: csak szöveget kezelünk; kép/hang/sticker esetén nincs válasz
      if (!text || !msg.mid) {
        console.info(`[webhook] Nem szöveges üzenet ${senderId}-től, kihagyva.`);
        continue;
      }

      /**
       * A Meta is_echo nélkül is visszaküldi a kimenő üzenetünket, és az
       * azonosítók alapján nem különböztethető meg egy igazi üzenettől. Amit
       * viszont épp mi küldtünk ki, azt felismerjük a szövegéről — és a küldő
       * azonosítóját eltároljuk, hogy a következő visszhangot már az alapján szűrjük.
       */
      if (await wasSentByUs(text)) {
        await markSelfId(senderId);
        console.info("[webhook] Saját kimenő üzenet (egyező szöveg), kihagyva. A küldő-azonosító megjegyezve.");
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

    for (const c of comments) {
      const commentId = c.comment_id ?? c.id;
      const fromId = c.from?.id;
      const text = c.text?.trim();
      if (!commentId || !fromId || !text) {
        // a szerkezetet eltesszük (kulcsok és típusok, tartalom nélkül): ebből
        // derül ki, ha a Meta más mezőneveket küld, mint amit a kód vár
        const shape = shapeOf(c);
        console.info("[webhook] Hiányos komment-esemény, kihagyva. Szerkezet:", JSON.stringify(shape));
        await noteUnhandled(shape);
        continue;
      }

      /**
       * A saját fiók kommentje. A Meta a mi nyilvános válaszunkról is küld
       * webhookot, és enélkül a bot a saját válaszára reagálna.
       */
      if (fromId === entry.id || (ownAccount && fromId === ownAccount) || (await isSelfId(fromId))) {
        console.info("[webhook] Saját komment, kihagyva.");
        continue;
      }
      if (await isOwnComment(commentId)) {
        console.info("[webhook] A saját válasz-kommentünk, kihagyva.");
        continue;
      }

      // ugyanaz a duplikátum-szűrés, mint a DM-eknél, csak komment ID-ra
      if (!(await firstDelivery(commentId))) {
        console.info(`[webhook] Már feldolgozott komment (${commentId}), kihagyva.`);
        continue;
      }

      try {
        await handleComment({
          commentId,
          userId: fromId,
          username: c.from?.username,
          text,
          mediaId: c.media?.id,
          parentId: c.parent_id,
        });
      } catch (err) {
        console.error(
          "[webhook] Komment-feldolgozási hiba:",
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
}
