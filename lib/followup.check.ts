// Önellenőrzés: node lib/followup.check.ts
import assert from "node:assert/strict";
import { ABLAK_ORA, dueConversations, followupDecision, lastIncomingAt, vartOrak } from "./followup.ts";
import type { Conversation, StoredMessage } from "./store.ts";
import { UTANKOVETES_MAX_ORA, type Utankovetes } from "./types.ts";

const ORA = 60 * 60 * 1000;
const MOST = Date.UTC(2026, 9, 17, 12, 0, 0);

const BE: Utankovetes = { be: true, orak: 6, maxDb: 1, szoveg: "Szia! Sikerült időpontot találnod?" };

const conv = (messages: StoredMessage[], patch: Partial<Conversation> = {}): Conversation => ({
  id: "u1", source: "dm", messages, handedOff: false, botEnabled: true,
  lastActivity: messages.at(-1)?.at ?? MOST, tokens: { input: 0, output: 0 }, costUsd: 0, ...patch,
});

/** Tipikus eset: az érdeklődő írt, a bot válaszolt, azóta csend. */
const elhalt = (csendOra: number, bejovoOra = csendOra + 0.1) =>
  conv([
    { role: "user", text: "Köszi, megnézem!", at: MOST - bejovoOra * ORA },
    { role: "assistant", text: "Szuper, várlak!", at: MOST - csendOra * ORA },
  ]);

const ok = (c: Conversation, s: Utankovetes = BE) => followupDecision(c, s, MOST);

// --- a boldog eset ---
const jo = ok(elhalt(8));
assert.equal(jo.kuldheto, true);
assert.equal(jo.kuldheto && jo.szoveg, "Szia! Sikerült időpontot találnod?");

// --- alapból KI van kapcsolva ---
assert.deepEqual(ok(elhalt(8), { ...BE, be: false }), { kuldheto: false, ok: "kikapcsolva" });
assert.deepEqual(ok(elhalt(8), { ...BE, szoveg: "   " }), { kuldheto: false, ok: "nincs-szoveg" });

// --- az embernél lévő beszélgetésbe soha nem szólunk bele ---
assert.deepEqual(ok(elhalt(8) && conv(elhalt(8).messages, { handedOff: true })), { kuldheto: false, ok: "atadva" });
assert.deepEqual(ok(conv(elhalt(8).messages, { botEnabled: false })), { kuldheto: false, ok: "bot-kikapcsolva" });
assert.deepEqual(ok(conv(elhalt(8).messages, { ignored: true })), { kuldheto: false, ok: "figyelmen-kivul" });

// ha ember válaszolt kézzel, az övé a szál
const kezi = conv([
  { role: "user", text: "Számlát adsz?", at: MOST - 9 * ORA },
  { role: "assistant", text: "Bocsi, utánanézek!", at: MOST - 8 * ORA, by: "human" },
]);
assert.deepEqual(ok(kezi), { kuldheto: false, ok: "ember-valaszolt" });

// --- ha az érdeklődő írt utoljára, RAJTUNK a sor ---
const miHallgatunk = conv([
  { role: "assistant", text: "Szia!", at: MOST - 9 * ORA },
  { role: "user", text: "Ott vagy?", at: MOST - 8 * ORA },
]);
assert.deepEqual(ok(miHallgatunk), { kuldheto: false, ok: "az-erdeklodon-a-sor" });

// --- időzítés ---
assert.deepEqual(ok(elhalt(2)), { kuldheto: false, ok: "meg-nem-telt-le" }, "2 óra csend még kevés");
assert.equal(ok(elhalt(5.9)).kuldheto, false, "6 óra alatt nem megy");
assert.equal(ok(elhalt(6.1)).kuldheto, true, "6 óra fölött megy");

// --- A META 24 ÓRÁS ABLAKA: ez a legfontosabb korlát ---
// a bot 7 órája hallgat, de az érdeklődő 23+ órája írt utoljára
const ablakonKivul = conv([
  { role: "user", text: "Köszi!", at: MOST - (ABLAK_ORA + 0.5) * ORA },
  { role: "assistant", text: "Szívesen!", at: MOST - 7 * ORA },
]);
assert.deepEqual(ok(ablakonKivul), { kuldheto: false, ok: "ablakon-kivul" },
  "a 24 órás ablakon túl automata üzenet nem mehet");

// közvetlenül az ablak előtt még mehet
const ablakElott = conv([
  { role: "user", text: "Köszi!", at: MOST - (ABLAK_ORA - 0.5) * ORA },
  { role: "assistant", text: "Szívesen!", at: MOST - 7 * ORA },
]);
assert.equal(ok(ablakElott).kuldheto, true);

// --- keret ---
assert.deepEqual(
  ok(conv(elhalt(8).messages, { followupCount: 1 })),
  { kuldheto: false, ok: "elfogyott-a-keret" },
);
assert.equal(ok(conv(elhalt(8).messages, { followupCount: 1 }), { ...BE, maxDb: 2 }).kuldheto, true);
assert.equal(ok(elhalt(8), { ...BE, maxDb: 0 }).kuldheto, false, "0 kerettel soha");
// kettőnél többet soha, akkor sem, ha valaki beírja
assert.equal(ok(conv(elhalt(8).messages, { followupCount: 2 }), { ...BE, maxDb: 99 }).kuldheto, false);

// --- a várakozás a megengedett sávra szorul ---
assert.equal(vartOrak({ ...BE, orak: 0 }), 1, "nullát nem engedünk: azonnali spam volna");
assert.equal(vartOrak({ ...BE, orak: -5 }), 1);
assert.equal(vartOrak({ ...BE, orak: 999 }), UTANKOVETES_MAX_ORA, "a 24 órás ablak miatt van plafon");
assert.equal(vartOrak({ ...BE, orak: Number.NaN }), 6, "hibás értéknél az alapértelmezés");

// --- üres beszélgetés ---
assert.deepEqual(ok(conv([])), { kuldheto: false, ok: "nincs-beszelgetes" });
assert.equal(lastIncomingAt(conv([])), null);
assert.equal(lastIncomingAt(elhalt(8)), MOST - 8.1 * ORA);

// --- söprés: legrégebbi csend elöl, felső korláttal ---
const sok = Array.from({ length: 9 }, (_, i) =>
  conv(elhalt(8 + i).messages, { id: `u${i}` }),
);
const esedekes = dueConversations(sok, BE, MOST);
assert.equal(esedekes.length, 5, "egy söprésben legfeljebb öt emlékeztető");
assert.ok(
  esedekes[0].conv.lastActivity < esedekes[4].conv.lastActivity,
  "a legrégebben elhallgatott megy elsőként",
);
assert.deepEqual(dueConversations(sok, { ...BE, be: false }, MOST), []);

console.log("followup: ok");
