import type { StoredMessage } from "./store.ts";

/**
 * Próba: mit válaszolna a bot MOST erre a beszélgetésre?
 *
 * Így lehet egy konfiguráció-módosítást valódi beszélgetésen ellenőrizni,
 * mielőtt éles érdeklődőn derülne ki, hogy nem jó. Semmi nem megy ki
 * Instagramra — a válasz csak a felületen jelenik meg.
 *
 * Tiszta függvények, hogy önellenőrzéssel futtathatók legyenek.
 */

export type PreviewMessage = { role: "user" | "assistant"; text: string };

/**
 * Az előzmény a modellnek. BEJÖVŐ üzenettel kell végződnie: a saját üzenettel
 * záruló előzményt az API elutasítja ("the conversation must end with a user
 * message"). A végéről ezért levágjuk a kimenő üzeneteket.
 */
export function historyForPreview(messages: StoredMessage[]): PreviewMessage[] | null {
  const vagott = [...messages];
  while (vagott.length && vagott[vagott.length - 1].role === "assistant") vagott.pop();
  if (!vagott.length) return null;
  return vagott.map((m) => ({ role: m.role, text: m.text }));
}

/** Az utolsó bejövő üzenet — a felületen ezt mutatjuk meg, mire válaszolna. */
export function lastIncoming(messages: StoredMessage[]): string | null {
  const history = historyForPreview(messages);
  return history ? history[history.length - 1].text : null;
}
