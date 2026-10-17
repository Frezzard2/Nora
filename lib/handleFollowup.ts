import "server-only";
import { clientConfig } from "./clientConfig";
import { dueConversations } from "./followup";
import { sendMessage } from "./instagram";
import { bump, isBotEnabled, listConversations, maySweepFollowups, update } from "./store";

/**
 * Utánkövetés-söprés: udvarias emlékeztető azoknak, akik elhallgattak.
 *
 * NINCS cron. A Vercel ingyenes csomagja napi egy ütemezést enged ±59 perc
 * pontossággal — a Meta 24 órás ablaka mellett ez könnyen lekésné vagy
 * túllépné az időt. Ehelyett a bejövő forgalom hajtja: minden webhook-esemény
 * után lefut egy fékezett söprés, és a forgalom a természetes óra.
 *
 * A söprés nem hív AI-t: kész szöveget küld, ezért nem is kerül pénzbe.
 */

const DAILY_LIMIT = Number(process.env.MAX_REPLIES_PER_DAY ?? 20);

export async function sweepFollowups(): Promise<void> {
  if (!(await isBotEnabled())) return;

  const { config } = await clientConfig();
  if (!config.utankovetes?.be) return;

  // a söprés az egész listát beolvassa — negyedóránként egyszer elég
  if (!(await maySweepFollowups())) return;

  const convs = await listConversations(300);
  const esedekes = dueConversations(convs, config.utankovetes, Date.now());
  if (!esedekes.length) return;

  console.info(`[utánkövetés] ${esedekes.length} beszélgetésnek jár emlékeztető.`);

  for (const { conv, szoveg } of esedekes) {
    const day = new Date().toISOString().slice(0, 10);
    if ((await bump(`reply:${conv.id}:${day}`, 60 * 60 * 24)) > DAILY_LIMIT) {
      console.warn(`[utánkövetés] ${conv.id}: napi válaszkorlát elérve, kihagyva.`);
      continue;
    }

    // ha a küldés elhasal, ne jegyezzük fel elküldöttként — különben a keret
    // elfogyna anélkül, hogy az érdeklődő bármit kapott volna
    if (!(await sendMessage(conv.id, szoveg))) {
      console.warn(`[utánkövetés] ${conv.id}: a küldés nem sikerült, nem számoljuk el.`);
      continue;
    }

    const at = Date.now();
    await update(conv.id, (c) => ({
      ...c,
      messages: [...c.messages, { role: "assistant" as const, text: szoveg, at }],
      lastActivity: at,
      followupCount: (c.followupCount ?? 0) + 1,
      lastFollowupAt: at,
    }));
    console.info(`[utánkövetés] ${conv.id}: emlékeztető elküldve.`);
  }
}
