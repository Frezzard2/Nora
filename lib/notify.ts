/**
 * Push értesítések tartalma.
 *
 * Miért kell egyáltalán: az Instagram magától értesít minden DM-ről, de a bot
 * 4 másodperc alatt válaszol, így a szál megválaszoltnak látszik — és éppen az
 * az eset vész el, amikor az ügyfélnek lépnie KELLENE. Ez az értesítés csak
 * akkor szól, amikor tényleg ember kell.
 *
 * Tiszta függvények, hogy önellenőrzéssel futtathatók legyenek.
 */

export type NotifyReason =
  /** a bot átadta a beszélgetést — ettől kezdve hallgat */
  | "atadas"
  /** az érdeklődő ír, de a bot ki van kapcsolva ezen a beszélgetésen */
  | "varakozik";

export type Notification = { title: string; body: string; url: string; tag: string };

/** Ennél hosszabb részletet nem teszünk az értesítésbe. */
const MAX_BODY = 140;

const roviditve = (text: string) => {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > MAX_BODY ? `${t.slice(0, MAX_BODY - 1)}…` : t;
};

/** Ahogy az értesítésben hívjuk az érdeklődőt. */
export const nevOf = (convId: string, username?: string) =>
  username?.trim() ? `@${username.trim()}` : "Egy érdeklődő";

export function buildNotification(input: {
  reason: NotifyReason;
  convId: string;
  username?: string;
  /** az érdeklődő üzenete, ami miatt szólunk */
  text: string;
}): Notification {
  const nev = nevOf(input.convId, input.username);

  return {
    title:
      input.reason === "atadas"
        ? `${nev} — neked szól`
        : `${nev} válaszra vár`,
    body: roviditve(input.text) || "Nyisd meg a beszélgetést.",
    url: `/admin/beszelgetesek/${encodeURIComponent(input.convId)}`,
    // beszélgetésenként egy értesítés látszik, az új lecseréli a régit
    tag: `conv-${input.convId}`,
  };
}
