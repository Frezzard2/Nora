import { after } from "next/server";
import { handleMessage } from "@/lib/handleMessage";
import { verifySignature } from "@/lib/signature";
import { firstDelivery } from "@/lib/store";

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
  message?: { mid?: string; text?: string; is_echo?: boolean };
};
type Payload = { entry?: { messaging?: MessagingEvent[] }[] };

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
    for (const event of entry.messaging ?? []) {
      const msg = event.message;
      const senderId = event.sender?.id;
      if (!msg || !senderId) continue;

      // a saját visszhangzó üzenetünk — nélküle a bot magának válaszolna
      if (msg.is_echo) {
        console.info("[webhook] Saját visszhangzó üzenet, kihagyva.");
        continue;
      }

      const text = msg.text?.trim();
      // ponytail: csak szöveget kezelünk; kép/hang/sticker esetén nincs válasz
      if (!text || !msg.mid) {
        console.info(`[webhook] Nem szöveges üzenet ${senderId}-től, kihagyva.`);
        continue;
      }

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
