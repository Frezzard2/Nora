/**
 * Munkamenet-süti és szerepkörök.
 *
 * Két szerep, két jelszó: a TULAJDONOS mindent lát (költség, technikai hibák,
 * globális vészkapcsoló), az ÜGYFÉL a saját beszélgetéseit és beállításait.
 *
 * A sütiben nem a jelszó van, hanem a jelszóból származtatott jegy. Így a süti
 * elolvasásából nem derül ki a jelszó, és nem kell külön aláíró kulcsot kezelni.
 * Szándékosan nincs külön lejárati mező a jegyben: a süti maxAge korlátoz, és a
 * jelszó cseréje minden korábbi jegyet egyszerre érvénytelenít.
 *
 * Edge és Node futtatókörnyezetben is működnie kell (a middleware edge-en fut),
 * ezért Web Crypto, nem node:crypto.
 */

export type Role = "owner" | "client";

export const SESSION_COOKIE = "nora_session";

/** 30 nap — ennyi idő után újra be kell jelentkezni. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Tulajdonos",
  client: "Ügyfél",
};

const passwordOf = (role: Role) =>
  (role === "owner" ? process.env.ADMIN_PASSWORD : process.env.CLIENT_PASSWORD)?.trim() || null;

/** Konstans idejű összehasonlítás — a találgatás ne legyen gyorsabb részegyezésnél. */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function digest(input: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** A sütibe kerülő érték, vagy null, ha ehhez a szerephez nincs beállított jelszó. */
export async function tokenFor(role: Role): Promise<string | null> {
  const password = passwordOf(role);
  if (!password) return null;
  return `${role}.${await digest(`${role}:${password}:nora-session-v1`)}`;
}

/** A süti értékéhez tartozó szerep, vagy null, ha a jegy nem érvényes. */
export async function roleFromCookie(value: string | undefined): Promise<Role | null> {
  if (!value) return null;
  for (const role of ["owner", "client"] as const) {
    const expected = await tokenFor(role);
    if (expected && equals(value, expected)) return role;
  }
  return null;
}

/**
 * A megadott jelszóhoz tartozó szerep. Ha a két jelszó véletlenül megegyezik,
 * a tulajdonos nyer — a szűkebb hozzáférést soha nem adjuk véletlenül többre.
 */
export async function roleForPassword(password: string): Promise<Role | null> {
  const given = password.trim();
  if (!given) return null;
  for (const role of ["owner", "client"] as const) {
    const expected = passwordOf(role);
    if (expected && equals(given, expected)) return role;
  }
  return null;
}

/** Van-e egyáltalán beállítva jelszó? Ha nincs, a felület zárva marad. */
export const anyPasswordSet = () => Boolean(passwordOf("owner") || passwordOf("client"));
