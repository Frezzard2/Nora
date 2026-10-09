// Önellenőrzés: node lib/comments.check.ts
import assert from "node:assert/strict";
import { matchRule, normalize, pickPublic } from "./comment-rules.ts";
import { MINDEN_POSZT, emptyRule, type CommentRule } from "./types.ts";

const rule = (patch: Partial<CommentRule>): CommentRule => ({ ...emptyRule(), ...patch });

// --- normalizálás ---
assert.equal(normalize("ÁRAT"), "arat");
assert.equal(normalize("  Hűűű   ŐsZ  "), "huuu osz");

// --- kulcsszó-egyezés ékezet és kisbetű nélkül ---
const arSzabaly = rule({ nev: "Ár", kulcsszavak: ["ár", "mennyi"] });
assert.equal(matchRule([arSzabaly], { text: "Szia! Mennyibe kerül?" })?.nev, "Ár");
assert.equal(matchRule([arSzabaly], { text: "AR?" })?.nev, "Ár", "ékezet nélkül is egyezik");
assert.equal(matchRule([arSzabaly], { text: "Nagyon tetszik!" }), null);

// --- kulcsszó nélküli szabály soha nem illeszkedik ---
assert.equal(
  matchRule([rule({ nev: "Üres", kulcsszavak: [] })], { text: "bármi" }),
  null,
  "üres kulcsszólista nem válaszolhat minden kommentre",
);
assert.equal(matchRule([rule({ kulcsszavak: ["  ", ""] })], { text: "bármi" }), null);

// --- kikapcsolt szabály kiesik, a sorrend dönt ---
const ki = rule({ nev: "Ki", be: false, kulcsszavak: ["info"] });
const be = rule({ nev: "Be", kulcsszavak: ["info"] });
assert.equal(matchRule([ki, be], { text: "INFO" })?.nev, "Be");

// --- poszt-szűrés ---
const egyPoszt = rule({ nev: "Poszt", kulcsszavak: ["info"], poszt: "123" });
assert.equal(matchRule([egyPoszt], { text: "info", mediaId: "123" })?.nev, "Poszt");
assert.equal(matchRule([egyPoszt], { text: "info", mediaId: "999" }), null);
assert.equal(
  matchRule([rule({ nev: "Mind", kulcsszavak: ["info"], poszt: MINDEN_POSZT })], {
    text: "info",
    mediaId: "999",
  })?.nev,
  "Mind",
);
// poszt-azonosító nélküli esemény nem illeszkedik konkrét poszthoz kötött szabályra
assert.equal(matchRule([egyPoszt], { text: "info" }), null);

// --- üres komment ---
assert.equal(matchRule([arSzabaly], { text: "   " }), null);

// --- nyilvános válasz választása ---
assert.equal(pickPublic(rule({ nyilvanosValaszok: [] })), null);
assert.equal(pickPublic(rule({ nyilvanosValaszok: ["  ", ""] })), null, "üres változat nem megy ki");
assert.equal(pickPublic(rule({ nyilvanosValaszok: ["Megírtam DM-ben!"] })), "Megírtam DM-ben!");

const valasztasok = new Set(
  Array.from({ length: 60 }, () => pickPublic(rule({ nyilvanosValaszok: ["A", "B", "C"] }))),
);
assert.equal(valasztasok.size, 3, "mindhárom változatnak elő kell fordulnia");

// --- az azonosítók egyediek, különben a statisztika összecsúszna ---
assert.notEqual(emptyRule().id, emptyRule().id);

// --- hiányos konfiguráció (kézzel szerkesztett NORA_CONFIG) nem dobhat kivételt ---
const csonka = [{ id: "x", nev: "Csonka", be: true, poszt: "minden" }] as unknown as CommentRule[];
assert.equal(matchRule(csonka, { text: "bármi" }), null);
assert.equal(matchRule(undefined as unknown as CommentRule[], { text: "bármi" }), null);
assert.equal(matchRule([arSzabaly], { text: undefined as unknown as string }), null);
assert.equal(pickPublic({ id: "x" } as unknown as CommentRule), null);

console.log("comments: ok");
