/**
 * Redis-kulcsok EGYETLEN képzési helye.
 *
 * Az Upstash ingyenes csomagban egy adatbázis van, ezért több deploy adata
 * ugyanabban az adatbázisban él. Az elválasztás a kulcs-előtaggal történik:
 * minden kulcs `${prefix}:...` alakú, és egyetlen deploy sem képez olyan
 * kulcsot, ami nem ezen a modulon megy keresztül.
 *
 * FONTOS: ez LOGIKAI elválasztás, nem fizikai. Ugyanaz a token mindhez hozzáfér.
 * Fizető ügyfélnél külön adatbázis kell — lásd README.
 */

export const DEFAULT_PREFIX = "default";

/**
 * Az előtag biztonságos alakja. A kettőspontot szándékosan kivesszük: azzal
 * egy előtag belelóghatna a másik névterébe (`a:b` kontra `a` + `b:...`).
 */
export function normalizePrefix(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim().toLowerCase();
  if (!trimmed) return DEFAULT_PREFIX;

  const safe = trimmed.replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
  return safe || DEFAULT_PREFIX;
}

export const resolvePrefix = () => normalizePrefix(process.env.REDIS_PREFIX);

/**
 * A deploy összes kulcsa. Új kulcsot CSAK ide szabad felvenni — ha valahol
 * máshol képződik sztringből Redis-kulcs, az kilóg a névtérből.
 */
export function makeKeys(rawPrefix: string | undefined | null) {
  const p = normalizePrefix(rawPrefix);

  return {
    /** a ténylegesen használt (normalizált) előtag */
    prefix: p,
    /** SCAN/listázás mintája — csak a saját névteret látja */
    scanPattern: `${p}:*`,

    conv: (id: string) => `${p}:conv:${id}`,
    /** index: beszélgetés-ID-k utolsó aktivitás szerint */
    index: `${p}:convs`,
    seen: (mid: string) => `${p}:seen:${mid}`,
    botSwitch: `${p}:bot`,
    config: `${p}:config`,
    lastUnhandled: `${p}:debug:last-unhandled`,
    lastIds: `${p}:debug:last-ids`,
    sent: (hash: string) => `${p}:sent:${hash}`,
    /** egy kommentre csak EGY privát válasz mehet — ez a nyoma, lejárat nélkül */
    privateReplied: (commentId: string) => `${p}:preply:${commentId}`,
    /** a saját nyilvános válasz-kommentjeink, hogy ne reagáljunk magunkra */
    ownComment: (commentId: string) => `${p}:own-comment:${commentId}`,
    ruleHit: (ruleId: string, day: string) => `${p}:rulehit:${ruleId}:${day}`,
    costDay: (day: string) => `${p}:cost:d:${day}`,
    costMonth: (month: string) => `${p}:cost:m:${month}`,
    selfIds: `${p}:self-ids`,
    entryIds: `${p}:debug:entry-ids`,
    counter: (scope: string) => `${p}:count:${scope}`,
  };
}

export type Keys = ReturnType<typeof makeKeys>;

/** Minden kulcs egy példányban, mintaértékekkel — az önellenőrzés ezt járja be. */
export function sampleKeys(keys: Keys): string[] {
  return [
    keys.conv("u1"),
    keys.index,
    keys.seen("m1"),
    keys.botSwitch,
    keys.config,
    keys.lastUnhandled,
    keys.lastIds,
    keys.sent("h1"),
    keys.privateReplied("c1"),
    keys.ownComment("c1"),
    keys.ruleHit("r1", "2026-10-12"),
    keys.costDay("2026-10-12"),
    keys.costMonth("2026-10"),
    keys.selfIds,
    keys.entryIds,
    keys.counter("send:2026-10-12T13"),
  ];
}
