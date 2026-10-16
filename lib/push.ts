import "server-only";
import webpush from "web-push";
import { buildNotification, type NotifyReason } from "./notify";
import { listPushSubs, mayNotify, removePushSub } from "./store";

/**
 * Push értesítés kiküldése a feliratkozott eszközökre.
 *
 * A VAPID kulcsokat egyszer kell előállítani (`npx web-push generate-vapid-keys`)
 * és env változóba tenni. A publikus kulcs szándékosan nem NEXT_PUBLIC_: a
 * felület szerveroldalról kapja meg, így a projekt továbbra sem szivárogtat
 * semmit a kliensbe env változón keresztül.
 */

let beallitva = false;

/** true, ha be van állítva a VAPID kulcspár — enélkül nincs értesítés. */
export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY?.trim() ?? "";

function setup(): boolean {
  if (beallitva) return true;
  if (!pushConfigured()) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || "mailto:noreply@example.com",
    process.env.VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
  beallitva = true;
  return true;
}

/**
 * Értesítés egy beszélgetésről. A fék miatt beszélgetésenként legfeljebb
 * 10 percenként szól — a hívó nem tud véletlenül záport indítani.
 */
export async function notifyAboutConversation(input: {
  reason: NotifyReason;
  convId: string;
  username?: string;
  text: string;
}): Promise<void> {
  if (!setup()) {
    console.info("[push] Nincs VAPID kulcs beállítva — nincs értesítés.");
    return;
  }

  const subs = await listPushSubs();
  if (!subs.length) return;

  if (!(await mayNotify(input.convId))) {
    console.info(`[push] ${input.convId}: a fék miatt most nem értesítünk.`);
    return;
  }

  const payload = JSON.stringify(buildNotification(input));

  const eredmenyek = await Promise.allSettled(
    subs.map((sub) => webpush.sendNotification(sub, payload)),
  );

  let kiment = 0;
  for (const [i, e] of eredmenyek.entries()) {
    if (e.status === "fulfilled") {
      kiment++;
      continue;
    }
    // 404/410: a böngésző eldobta a feliratkozást — takarítsuk ki, ne próbáljuk örökké
    const status = (e.reason as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) {
      await removePushSub(subs[i].endpoint);
      console.info("[push] Lejárt feliratkozás eltávolítva.");
    } else {
      console.error(`[push] Küldés sikertelen (${status ?? "ismeretlen hiba"}).`);
    }
  }
  console.info(`[push] Értesítés kiküldve ${kiment}/${subs.length} eszközre (${input.reason}).`);
}

/** Próba-értesítés a felületről, hogy az ügyfél lássa, tényleg megérkezik. */
export async function sendTestNotification(): Promise<{ ok: boolean; kiment: number }> {
  if (!setup()) return { ok: false, kiment: 0 };

  const subs = await listPushSubs();
  const payload = JSON.stringify({
    title: "Nora — próba",
    body: "Így fog kinézni, ha egy érdeklődő rád vár.",
    url: "/admin",
    tag: "proba",
  });

  const eredmenyek = await Promise.allSettled(
    subs.map((sub) => webpush.sendNotification(sub, payload)),
  );
  const kiment = eredmenyek.filter((e) => e.status === "fulfilled").length;
  return { ok: kiment > 0, kiment };
}
