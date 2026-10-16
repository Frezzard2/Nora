// Önellenőrzés: node lib/notify.check.ts
import assert from "node:assert/strict";
import { buildNotification, nevOf } from "./notify.ts";

// --- megnevezés ---
assert.equal(nevOf("u1", "mate_t_2000"), "@mate_t_2000");
assert.equal(nevOf("u1", undefined), "Egy érdeklődő", "név nélkül sem lehet üres a cím");
assert.equal(nevOf("u1", ""), "Egy érdeklődő");
assert.equal(nevOf("u1", "   "), "Egy érdeklődő");

// --- átadás ---
const atadas = buildNotification({
  reason: "atadas",
  convId: "2010902789614870",
  username: "mate_t_2000",
  text: "Igazából az attól függ mik lennének bent, havi kiadás lenne-e vagy egyszeri",
});
assert.equal(atadas.title, "@mate_t_2000 — neked szól");
assert.ok(atadas.body.startsWith("Igazából az attól függ"));
assert.equal(atadas.url, "/admin/beszelgetesek/2010902789614870");
assert.equal(atadas.tag, "conv-2010902789614870");

// --- várakozás (a bot ki van kapcsolva, az érdeklődő mégis ír) ---
const var_ = buildNotification({ reason: "varakozik", convId: "u2", username: "anna", text: "Ott vagy?" });
assert.equal(var_.title, "@anna válaszra vár");
assert.equal(var_.body, "Ott vagy?");

// --- hosszú üzenet rövidítése ---
const hosszu = buildNotification({
  reason: "atadas", convId: "u3", text: "x".repeat(400),
});
assert.ok(hosszu.body.length <= 140, `az értesítés törzse ${hosszu.body.length} karakter lett`);
assert.ok(hosszu.body.endsWith("…"), "a levágást jelezni kell");

// --- sortörések és dupla szóközök összehúzása ---
assert.equal(
  buildNotification({ reason: "atadas", convId: "u4", text: "  első sor\n\nmásodik   sor  " }).body,
  "első sor második sor",
);

// --- üres üzenet sem adhat üres értesítést ---
assert.equal(buildNotification({ reason: "atadas", convId: "u5", text: "   " }).body, "Nyisd meg a beszélgetést.");

// --- az URL-t a beszélgetés azonosítója adja, escape-elve ---
assert.equal(
  buildNotification({ reason: "atadas", convId: "a/b c", text: "x" }).url,
  "/admin/beszelgetesek/a%2Fb%20c",
);

console.log("notify: ok");
