// Önellenőrzés: node lib/gaps.check.ts
import assert from "node:assert/strict";
import { groupGaps, isUsefulQuestion, type Gap } from "./gaps.ts";

const g = (question: string, at: number, convId = "u1", username?: string): Gap => ({
  question, at, convId, username,
});

// --- mi ér meg egy GYIK-bejegyzést ---
assert.equal(isUsefulQuestion("Hány perces a konzultáció?"), true);
assert.equal(isUsefulQuestion("ok"), false, "két karakterből nem lesz GYIK");
assert.equal(isUsefulQuestion("   "), false);
assert.equal(isUsefulQuestion("👍"), false, "emojiból sem");
assert.equal(isUsefulQuestion("Mennyibe"), true, "8 karakter már elég");

// --- összevonás ---
assert.deepEqual(groupGaps([]), []);

const egy = groupGaps([g("Hány perces a konzultáció?", 100)]);
assert.equal(egy.length, 1);
assert.equal(egy[0].count, 1);

// ékezet és kisbetű nem számít — ugyanaz a kérdés
const vegyes = groupGaps([
  g("Hány perces a konzultáció?", 100),
  g("hany perces a konzultacio?", 200),
  g("HÁNY PERCES A KONZULTÁCIÓ?", 300),
]);
assert.equal(vegyes.length, 1, "a három alak egy kérdés");
assert.equal(vegyes[0].count, 3);
assert.equal(vegyes[0].at, 300, "a legfrissebb előfordulás adatai maradnak");

// írásjel sem vághatja szét: ezt élesben a felületen kaptam el, a fenti teszt átengedte
const irasjel = groupGaps([
  g("Mennyibe kerül havonta?", 100),
  g("mennyibe kerul havonta", 200),
  g("Mennyibe kerül havonta...", 300),
  g("mennyibe kerül, havonta?!", 400),
]);
assert.equal(irasjel.length, 1, "az írásjel nem tehet külön kérdéssé azonos szöveget");
assert.equal(irasjel[0].count, 4);

// a gyakoribb kérdés kerül előre
const sorrend = groupGaps([
  g("Van garancia?", 500),
  g("Mennyibe kerül havonta?", 100),
  g("mennyibe kerul havonta?", 200),
]);
assert.equal(sorrend[0].question, "mennyibe kerul havonta?");
assert.equal(sorrend[0].count, 2);
assert.equal(sorrend[1].question, "Van garancia?");

// azonos darabszámnál a frissebb nyer
const dontetlen = groupGaps([g("Régi kérdés ez itt", 100), g("Friss kérdés ez itt", 900)]);
assert.equal(dontetlen[0].question, "Friss kérdés ez itt");

// a legfrissebb beszélgetésre mutat, hogy oda lehessen ugrani
const ugras = groupGaps([
  g("Mennyibe kerül?", 100, "regi-conv", "regi_user"),
  g("mennyibe kerül?", 900, "friss-conv", "friss_user"),
]);
assert.equal(ugras[0].convId, "friss-conv");
assert.equal(ugras[0].username, "friss_user");

// üres kérdés nem kerül a listába
assert.deepEqual(groupGaps([g("   ", 100)]), []);

console.log("gaps: ok");
