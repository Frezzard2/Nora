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
  /**
   * Instagram felhasználónév. Kommentből azonnal megkapjuk, DM-nél külön lekérdezés.
   * Üres sztring: lekértük, de nem kaptuk meg — így nem próbáljuk újra minden üzenetnél.
   * Hiányzó mező: még nem kértük le.
   */
  username?: string;
  /**
   * Figyelmen kívül hagyott fiók: se DM-re, se kommentre nem reagálunk, és az
   * üzenetet sem tároljuk. A saját személyes fiókodra kell — az üzeneted valódi
   * DM-ként érkezik, a visszhang-szűrés nem fogja meg.
   */
  ignored?: boolean;
  /** honnan indult a beszélgetés */
  source: "dm" | "comment";
  /** a poszt (média) azonosítója, ha kommentből indult */
  postId?: string;
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
  /** egy kommentre csak EGY privát válasz mehet — ez a nyoma, lejárat nélkül */
  privateReplied: (commentId: string) => `nora:preply:${commentId}`,
  /** a saját nyilvános válasz-kommentjeink, hogy ne reagáljunk magunkra */
  ownComment: (commentId: string) => `nora:own-comment:${commentId}`,
  ruleHit: (ruleId: string, day: string) => `nora:rulehit:${ruleId}:${day}`,
  costDay: (day: string) => `nora:cost:d:${day}`,
  costMonth: (month: string) => `nora:cost:m:${month}`,
  selfIds: "nora:self-ids",
  entryIds: "nora:debug:entry-ids",
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
  source: "dm",
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

/**
 * Hibakereséshez: mely fiókokra érkeztek eddig események. Egy apphoz több
 * Instagram fiók is köthető, és ebből derül ki, melyik az, amelyikhez a
 * tokenünk tartozik (IG_ACCOUNT_ID).
 */
export async function noteEntryId(id: string): Promise<void> {
  await db().sadd(KEY.entryIds, id);
}

export async function getEntryIds(): Promise<string[]> {
  return await db().smembers(KEY.entryIds);
}

/**
 * A megfigyelt fiók-azonosítók nullázása. A lista halmozódik, ezért egy rosszul
 * bekötött fiók azonosítója örökre ott maradna — így viszont a webhook-beállítás
 * módosítása után tiszta lappal látod, melyik fiókról érkezik tényleg esemény.
 */
export async function clearEntryIds(): Promise<void> {
  await db().del(KEY.entryIds);
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

/**
 * true, ha erre a kommentre MOST megy ki először privát válasz.
 *
 * A Meta szabálya: egy kommentre összesen egy privát üzenet küldhető. A második
 * próbálkozást a Meta hibával utasítja el, de addig is kiszámoltuk az AI-választ.
 * Ezért lejárat nélkül tároljuk — amire egyszer ment, arra soha többet.
 */
export async function firstPrivateReply(commentId: string): Promise<boolean> {
  return (await db().set(KEY.privateReplied(commentId), 1, { nx: true })) === "OK";
}

/**
 * A saját nyilvános válasz-kommentünk azonosítója. A Meta a mi kommentünkről is
 * küld webhookot, és a `from.id` szűrés nem minden esetben elég (lásd a DM-ek
 * visszhang-szűrését) — ezért amit kiírtunk, azt felismerjük.
 */
export async function markOwnComment(commentId: string): Promise<void> {
  await db().set(KEY.ownComment(commentId), 1, { ex: 60 * 60 * 24 * 30 });
}

export async function isOwnComment(commentId: string): Promise<boolean> {
  return (await db().exists(KEY.ownComment(commentId))) === 1;
}

/** Napi bontású szabály-találat. A 7 napos kimutatáshoz 8 napig él. */
export async function bumpRuleHit(ruleId: string): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const key = KEY.ruleHit(ruleId, day);
  if ((await db().incr(key)) === 1) await db().expire(key, 60 * 60 * 24 * 8);
}

const DAYS_BACK = 7;

/** Szabályonként az elmúlt 7 nap találatszáma. */
export async function ruleHits(ruleIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (!ruleIds.length) return out;

  const days = Array.from({ length: DAYS_BACK }, (_, i) =>
    new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10),
  );
  const keys = ruleIds.flatMap((id) => days.map((d) => KEY.ruleHit(id, d)));
  const values = await db().mget<(number | null)[]>(...keys);

  ruleIds.forEach((id, i) => {
    out[id] = values
      .slice(i * DAYS_BACK, (i + 1) * DAYS_BACK)
      .reduce<number>((sum, v) => sum + Number(v ?? 0), 0);
  });
  return out;
}

/**
 * AI-költség napi és havi bontásban. A beszélgetésekben tárolt összeg csak
 * halmozott, az „mai / havi költség" ebből nem jönne ki.
 */
export async function bumpCost(usd: number): Promise<void> {
  if (!(usd > 0)) return;
  const now = new Date().toISOString();
  await db().incrbyfloat(KEY.costDay(now.slice(0, 10)), usd);
  await db().expire(KEY.costDay(now.slice(0, 10)), 60 * 60 * 24 * 40);
  await db().incrbyfloat(KEY.costMonth(now.slice(0, 7)), usd);
  await db().expire(KEY.costMonth(now.slice(0, 7)), 60 * 60 * 24 * 400);
}

/** [mai, e havi] AI-költség USD-ben. */
export async function costSoFar(): Promise<{ today: number; month: number }> {
  const now = new Date().toISOString();
  const [today, month] = await db().mget<(string | number | null)[]>(
    KEY.costDay(now.slice(0, 10)),
    KEY.costMonth(now.slice(0, 7)),
  );
  return { today: Number(today ?? 0), month: Number(month ?? 0) };
}
