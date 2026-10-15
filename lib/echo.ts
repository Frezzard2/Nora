import type { StoredMessage } from "./store.ts";

/**
 * Visszhang-osztályozás: ki írta a kimenő üzenetet?
 *
 * A Meta a fiók MINDEN kimenő üzenetét visszaküldi `is_echo` jelzéssel — azt
 * is, amit a bot küldött, és azt is, amit az ügyfél kézzel írt az Instagramból.
 * A kettőt meg kell különböztetni: a sajátunkat már eltároltuk, az emberit
 * viszont eddig eldobtuk, pedig pont az a legértékesebb.
 *
 * Tiszta függvény, hogy önellenőrzéssel futtatható legyen — ez a kódbázis
 * legtörékenyebb köre, itt egy hiba végtelen válaszolást okozhat.
 */

export type EchoKind =
  /** a bot saját üzenete — már tárolva van, nincs teendő */
  | "sajat"
  /** az ügyfél kézzel írta az Instagramból — ezt el kell tárolni */
  | "ember"
  /** nincs ilyen beszélgetésünk — kimenő üzenetből ne hozzunk létre újat */
  | "ismeretlen";

/** Szerepel-e már szó szerint a beszélgetés kimenő üzenetei között? */
export function alreadyStored(text: string, messages: StoredMessage[]): boolean {
  const needle = text.trim();
  return messages.some((m) => m.role === "assistant" && m.text.trim() === needle);
}

export function classifyEcho(input: {
  text: string;
  messages: StoredMessage[];
  /** a kimenő üzenetek rövid életű nyoma (store.wasSentByUs) */
  sentByUs: boolean;
}): EchoKind {
  // Üres beszélgetésbe nem írunk: ha a coach ír rá valakire először, abból ne
  // keletkezzen fantom-beszélgetés a felületen.
  if (!input.messages.length) return "ismeretlen";

  // Két független jel a sajátunkra. A nyom 15 perc után lejár, ezért kell a
  // tárolt üzenetekkel való összevetés is — késve érkező visszhangnál az ment.
  if (input.sentByUs) return "sajat";
  if (alreadyStored(input.text, input.messages)) return "sajat";

  return "ember";
}
