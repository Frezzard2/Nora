// Önellenőrzés: node lib/preview.check.ts
import assert from "node:assert/strict";
import { historyForPreview, lastIncoming } from "./preview.ts";
import type { StoredMessage } from "./store.ts";

const m = (role: "user" | "assistant", text: string, by?: "bot" | "human"): StoredMessage =>
  ({ role, text, at: 1, ...(by ? { by } : {}) });

// --- a modell nem fogad el kimenő üzenettel záruló előzményt ---
// (ezt élesben kaptam meg: "the conversation must end with a user message")
const botValasszalVegzodik = [m("user", "Szia"), m("assistant", "Szia! Miben segíthetek?")];
const h = historyForPreview(botValasszalVegzodik);
assert.equal(h?.length, 1, "a záró bot-üzenetet le kell vágni");
assert.equal(h?.[0].role, "user");

// több kimenő üzenet a végén: mindet le kell vágni
const tobbBot = [
  m("user", "Szia"),
  m("assistant", "Szia!"),
  m("user", "Mennyibe kerül?"),
  m("assistant", "Küldöm a linket."),
  m("assistant", "Itt van: https://pelda.hu", "human"),
];
const h2 = historyForPreview(tobbBot);
assert.equal(h2?.length, 3);
assert.equal(h2?.[2].text, "Mennyibe kerül?");

// --- bejövő üzenettel záruló előzmény érintetlen marad ---
const varakozik = [m("user", "Szia"), m("assistant", "Szia!"), m("user", "Ott vagy?")];
assert.equal(historyForPreview(varakozik)?.length, 3);
assert.equal(historyForPreview(varakozik)?.at(-1)?.text, "Ott vagy?");

// --- nincs mit megmutatni ---
assert.equal(historyForPreview([]), null);
assert.equal(historyForPreview([m("assistant", "Szia!")]), null, "csak kimenő üzenetből nincs próba");
assert.equal(
  historyForPreview([m("assistant", "a"), m("assistant", "b")]),
  null,
);

// --- az utolsó bejövő üzenet ---
assert.equal(lastIncoming(botValasszalVegzodik), "Szia");
assert.equal(lastIncoming(varakozik), "Ott vagy?");
assert.equal(lastIncoming([]), null);

// --- a kézzel írt válasz is kimenő üzenet, azt is le kell vágni ---
assert.equal(lastIncoming([m("user", "Számlát adsz?"), m("assistant", "Bocsi, mindjárt!", "human")]), "Számlát adsz?");

// --- az eredeti tömböt nem módosítjuk ---
const eredeti = [m("user", "a"), m("assistant", "b")];
historyForPreview(eredeti);
assert.equal(eredeti.length, 2, "a hívás nem csonkíthatja a beszélgetést");

console.log("preview: ok");
