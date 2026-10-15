// Önellenőrzés: node lib/echo.check.ts
import assert from "node:assert/strict";
import { alreadyStored, classifyEcho } from "./echo.ts";
import type { StoredMessage } from "./store.ts";

const m = (role: "user" | "assistant", text: string): StoredMessage => ({ role, text, at: 1 });

const beszelgetes: StoredMessage[] = [
  m("user", "Szia! Mennyibe kerül?"),
  m("assistant", "Szia! Küldöm a részleteket."),
];

// --- már tárolt kimenő üzenet felismerése ---
assert.equal(alreadyStored("Szia! Küldöm a részleteket.", beszelgetes), true);
assert.equal(alreadyStored("  Szia! Küldöm a részleteket.  ", beszelgetes), true, "whitespace nem számít");
assert.equal(alreadyStored("Valami egészen más.", beszelgetes), false);
assert.equal(alreadyStored("Szia! Mennyibe kerül?", beszelgetes), false, "a BEJÖVŐ üzenet nem a miénk");

// --- osztályozás ---
assert.equal(
  classifyEcho({ text: "Szia! Küldöm a részleteket.", messages: beszelgetes, sentByUs: true }),
  "sajat",
);
assert.equal(
  classifyEcho({ text: "Szia! Küldöm a részleteket.", messages: beszelgetes, sentByUs: false }),
  "sajat",
  "lejárt nyom esetén a tárolt üzenet dönt",
);
assert.equal(
  classifyEcho({ text: "Szia Máté, bocsi a késésért — mindjárt hívlak!", messages: beszelgetes, sentByUs: false }),
  "ember",
  "amit nem mi küldtünk és nincs eltárolva, azt ember írta",
);

// --- üres beszélgetésbe soha nem írunk ---
assert.equal(
  classifyEcho({ text: "Szia, láttam a storydat!", messages: [], sentByUs: false }),
  "ismeretlen",
  "kimenő üzenetből nem keletkezhet új beszélgetés",
);
assert.equal(classifyEcho({ text: "bármi", messages: [], sentByUs: true }), "ismeretlen");

// --- a legfontosabb: a bot saját üzenete SOHA nem minősülhet emberinek ---
// (különben a felület hamisan mutatná, hogy az ügyfél válaszolt)
for (const sentByUs of [true, false]) {
  const kind = classifyEcho({ text: "Szia! Küldöm a részleteket.", messages: beszelgetes, sentByUs });
  assert.notEqual(kind, "ember", `a bot üzenete emberinek minősült (sentByUs=${sentByUs})`);
}

console.log("echo: ok");
