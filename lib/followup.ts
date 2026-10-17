import type { Conversation } from "./store.ts";
import { UTANKOVETES_MAX_ORA, type Utankovetes } from "./types.ts";

/**
 * Utánkövetés: megérdemel-e egy beszélgetés udvarias emlékeztetőt?
 *
 * Ez a projekt eddigi legkockázatosabb funkciója: kéretlen üzenetet küld
 * idegen embereknek az ügyfél nevében. Ezért minden feltétel KIZÁRÓ, és
 * tiszta függvényként tesztelhető.
 *
 * A legfontosabb korlát a Metáé: „Businesses have up to 24 hours to respond
 * to a user." Az ablak az érdeklődő UTOLSÓ üzenetétől számít, nem a miénktől.
 * Ezen túl csak HUMAN_AGENT címkével lehet írni, ami kézi emberi válaszra
 * való — automata emlékeztetőre használni szabálysértés volna.
 */

const ORA = 60 * 60 * 1000;

/** Biztonsági tartalék az ablak végéig: ennél közelebb nem megyünk a 24 órához. */
export const ABLAK_ORA = 23;

export type FollowupDecision =
  | { kuldheto: true; szoveg: string }
  | { kuldheto: false; ok: FollowupSkip };

export type FollowupSkip =
  | "kikapcsolva"
  | "nincs-szoveg"
  | "atadva"
  | "bot-kikapcsolva"
  | "figyelmen-kivul"
  | "nincs-beszelgetes"
  | "ember-valaszolt"
  | "az-erdeklodon-a-sor"
  | "meg-nem-telt-le"
  | "elfogyott-a-keret"
  | "ablakon-kivul";

/** Az érdeklődő utolsó üzenetének ideje — ettől számol a Meta 24 órás ablaka. */
export function lastIncomingAt(conv: Conversation): number | null {
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    if (conv.messages[i].role === "user") return conv.messages[i].at;
  }
  return null;
}

/** A beállított várakozás órákban, a megengedett sávra szorítva. */
export const vartOrak = (u: Utankovetes) =>
  Math.min(Math.max(Number.isFinite(u.orak) ? u.orak : 6, 1), UTANKOVETES_MAX_ORA);

export function followupDecision(
  conv: Conversation,
  settings: Utankovetes,
  now: number,
): FollowupDecision {
  if (!settings.be) return { kuldheto: false, ok: "kikapcsolva" };

  const szoveg = settings.szoveg.trim();
  if (!szoveg) return { kuldheto: false, ok: "nincs-szoveg" };

  // Az embernél lévő beszélgetésbe soha nem szólunk bele.
  if (conv.handedOff) return { kuldheto: false, ok: "atadva" };
  if (!conv.botEnabled) return { kuldheto: false, ok: "bot-kikapcsolva" };
  if (conv.ignored) return { kuldheto: false, ok: "figyelmen-kivul" };

  const utolso = conv.messages[conv.messages.length - 1];
  if (!utolso) return { kuldheto: false, ok: "nincs-beszelgetes" };

  // Ha az érdeklődő írt utoljára, NEM ő hallgat — rajtunk a sor, nem emlékeztetni kell.
  if (utolso.role === "user") return { kuldheto: false, ok: "az-erdeklodon-a-sor" };

  // Ha ember válaszolt kézzel, az övé a szál.
  if (utolso.by === "human") return { kuldheto: false, ok: "ember-valaszolt" };

  const mar = conv.followupCount ?? 0;
  const keret = Math.min(Math.max(Number.isFinite(settings.maxDb) ? settings.maxDb : 1, 0), 2);
  if (mar >= keret) return { kuldheto: false, ok: "elfogyott-a-keret" };

  // A csend a mi utolsó üzenetünk óta telik.
  if (now - utolso.at < vartOrak(settings) * ORA) {
    return { kuldheto: false, ok: "meg-nem-telt-le" };
  }

  // A Meta ablaka az ÉRDEKLŐDŐ utolsó üzenetétől ketyeg.
  const bejovo = lastIncomingAt(conv);
  if (bejovo === null) return { kuldheto: false, ok: "nincs-beszelgetes" };
  if (now - bejovo >= ABLAK_ORA * ORA) return { kuldheto: false, ok: "ablakon-kivul" };

  return { kuldheto: true, szoveg };
}

/** Egy söprésben legfeljebb ennyi emlékeztető mehet ki. */
export const MAX_EGY_SOPRESBEN = 5;

/** A küldhető beszélgetések, legrégebbi csend elöl, felső korláttal. */
export function dueConversations(
  convs: Conversation[],
  settings: Utankovetes,
  now: number,
): { conv: Conversation; szoveg: string }[] {
  return convs
    .map((conv) => ({ conv, d: followupDecision(conv, settings, now) }))
    .filter((x): x is { conv: Conversation; d: { kuldheto: true; szoveg: string } } => x.d.kuldheto)
    .sort((a, b) => a.conv.lastActivity - b.conv.lastActivity)
    .slice(0, MAX_EGY_SOPRESBEN)
    .map((x) => ({ conv: x.conv, szoveg: x.d.szoveg }));
}
