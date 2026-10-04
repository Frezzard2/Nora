import "server-only";
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

/**
 * Beszélgetés-állapot tárolása. Serverless futásnál a memória két hívás között
 * eldobódik, ezért kell külső tároló. Minden adatbázis-hozzáférés ezen a
 * modulon megy át — csak ezt a fájlt kell kicserélni, ha nem Upstash lesz.
 */

export type StoredMessage = { role: "user" | "assistant"; text: string; at: number };

export type Conversation = {
  /** Instagram-scoped user ID — ez a kulcs */
  id: string;
  messages: StoredMessage[];
  /** embernek átadva: a bot innentől hallgat */
  handedOff: boolean;
  /** beszélgetés-szintű kapcsoló */
  botEnabled: boolean;
  lastActivity: number;
  tokens: { input: number; output: number };
  /** becsült AI-költség USD-ben */
  costUsd: number;
};

const KEY = {
  conv: (id: string) => `nora:conv:${id}`,
  /** index: beszélgetés-ID-k utolsó aktivitás szerint */
  index: "nora:convs",
  seen: (mid: string) => `nora:seen:${mid}`,
  botSwitch: "nora:bot",
  config: "nora:config",
  lastUnhandled: "nora:debug:last-unhandled",
  lastIds: "nora:debug:last-ids",
  sent: (hash: string) => `nora:sent:${hash}`,
  selfIds: "nora:self-ids",
  counter: (scope: string) => `nora:count:${scope}`,
};

/** A feldolgozott message ID-k ennyi ideig blokkolják az újraküldést. */
const SEEN_TTL = 60 * 60 * 24;
/** Ennyi üzenet marad meg beszélgetésenként (a prompt se nőjön a végtelenbe). */
const MAX_MESSAGES = 60;

let redis: Redis | null = null;
/** Lusta kliens: a modul importálása még ne kérje az env változókat. */
const db = () => (redis ??= Redis.fromEnv());

const fresh = (id: string): Conversation => ({
  id,
  messages: [],
  handedOff: false,
  botEnabled: true,
  lastActivity: Date.now(),
  tokens: { input: 0, output: 0 },
  costUsd: 0,
});

export async function getConversation(id: string): Promise<Conversation> {
  return (await db().get<Conversation>(KEY.conv(id))) ?? fresh(id);
}

/** Van-e már eltárolva ilyen beszélgetés? (Az admin csak létezőt módosíthat.) */
export async function conversationExists(id: string): Promise<boolean> {
  return (await db().exists(KEY.conv(id))) === 1;
}

/**
 * Olvasás → módosítás → írás egy lépésben.
 * ponytail: nincs lock. Egy beszélgetésen belül az üzenetek sorban érkeznek,
 * ezért a gyakorlatban nem ütköznek. Ha mégis kell: Redis WATCH/MULTI vagy
 * beszélgetésenkénti lock kulcs.
 */
export async function update(
  id: string,
  patch: (conv: Conversation) => Conversation,
): Promise<Conversation> {
  const next = patch(await getConversation(id));
  next.messages = next.messages.slice(-MAX_MESSAGES);
  await db().set(KEY.conv(id), next);
  await db().zadd(KEY.index, { score: next.lastActivity, member: id });
  return next;
}

/** Beszélgetések, legutóbb aktív elöl. */
export async function listConversations(limit = 100): Promise<Conversation[]> {
  const ids = await db().zrange<string[]>(KEY.index, 0, limit - 1, { rev: true });
  if (!ids.length) return [];
  const rows = await db().mget<(Conversation | null)[]>(...ids.map((id) => KEY.conv(id)));
  return rows.filter((c): c is Conversation => c !== null);
}

/**
 * true, ha ez a message ID most került be először. A Meta ugyanazt az
 * eseményt újraküldi, ha lassú a válasz — a duplikátumot itt szűrjük ki.
 */
export async function firstDelivery(mid: string): Promise<boolean> {
  return (await db().set(KEY.seen(mid), 1, { nx: true, ex: SEEN_TTL })) === "OK";
}

/** Globális vészkapcsoló. Alapértelmezés: be van kapcsolva. */
export async function isBotEnabled(): Promise<boolean> {
  return (await db().get<string>(KEY.botSwitch)) !== "off";
}

export async function setBotEnabled(on: boolean): Promise<void> {
  await db().set(KEY.botSwitch, on ? "on" : "off");
}

/** A felületről mentett konfiguráció, ha van. */
export async function getStoredConfig<T>(): Promise<T | null> {
  return await db().get<T>(KEY.config);
}

/** A varázslóból mentett konfiguráció. Ez nyer az env változó és a fájl felett. */
export async function setStoredConfig(config: unknown): Promise<void> {
  await db().set(KEY.config, config);
}

/**
 * Hibakereséshez: a legutóbbi feldolgozhatatlan webhook-payload SZERKEZETE
 * (kulcsok és típusok, értékek nélkül). Beállításkor ebből derül ki, ha a Meta
 * más alakban küld, mint amit a kód vár. Egy nap után lejár.
 */
export async function noteUnhandled(shape: unknown): Promise<void> {
  await db().set(KEY.lastUnhandled, { at: new Date().toISOString(), shape }, { ex: 60 * 60 * 24 });
}

/**
 * A kimenő üzenetek visszhangjának felismerése.
 *
 * A Meta a saját kimenő üzenetünket bejövőként is visszaküldi, is_echo jelzés
 * nélkül, és az azonosítók alapján nem különböztethető meg egy igazi üzenettől
 * (a küldő a bot saját, app-hoz kötött azonosítója, a címzett pedig a fiók).
 * Ezért amit kiküldünk, azt feljegyezzük, és ha ugyanaz jön vissza, kiszűrjük.
 *
 * ponytail: 15 perces ablak és szó szerinti egyezés. Ha egy érdeklődő pont
 * ugyanazt a szöveget írja be ennyi időn belül, azt az egy üzenetet elhagyjuk.
 * A visszhangból megtanult küldő-azonosító viszont lejárat nélkül szűr.
 */
const SENT_TTL = 15 * 60;

const hash = (text: string) => createHash("sha1").update(text.trim()).digest("hex").slice(0, 16);

export async function rememberSent(text: string): Promise<void> {
  await db().set(KEY.sent(hash(text)), 1, { ex: SENT_TTL });
}

export async function wasSentByUs(text: string): Promise<boolean> {
  return (await db().exists(KEY.sent(hash(text)))) === 1;
}

/** A visszhangból megtanult saját küldő-azonosító — innentől azonnal szűrhető. */
export async function markSelfId(id: string): Promise<void> {
  await db().sadd(KEY.selfIds, id);
}

export async function isSelfId(id: string): Promise<boolean> {
  return (await db().sismember(KEY.selfIds, id)) === 1;
}

/** Hibakereséshez: a legutóbbi esemény opak azonosítói, tartalom nélkül. */
export async function noteIds(ids: unknown): Promise<void> {
  await db().set(KEY.lastIds, { at: new Date().toISOString(), ids }, { ex: 60 * 60 * 24 });
}

export async function getUnhandled<T>(): Promise<T | null> {
  return await db().get<T>(KEY.lastUnhandled);
}

/** Lejáró számláló (napi/óránkénti korlátokhoz). A számláló új értékét adja. */
export async function bump(scope: string, ttlSeconds: number): Promise<number> {
  const key = KEY.counter(scope);
  const n = await db().incr(key);
  if (n === 1) await db().expire(key, ttlSeconds);
  return n;
}
