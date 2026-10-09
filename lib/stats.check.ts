// Önellenőrzés: node lib/stats.check.ts
import assert from "node:assert/strict";
import { LEZART_UTAN_MS, convState, duration, overview } from "./stats.ts";
import type { Conversation } from "./store.ts";

const NOW = Date.UTC(2026, 9, 9, 12, 0, 0); // 2026-10-09 14:00 magyar idő
const MIN = 60_000;

const conv = (patch: Partial<Conversation>): Conversation => ({
  id: "u1",
  source: "dm",
  messages: [],
  handedOff: false,
  botEnabled: true,
  lastActivity: NOW,
  tokens: { input: 0, output: 0 },
  costUsd: 0,
  ...patch,
});

// --- állapotok ---
assert.equal(convState(conv({}), NOW), "bot");
assert.equal(convState(conv({ handedOff: true }), NOW), "atadva");
assert.equal(convState(conv({ botEnabled: false }), NOW), "kikapcsolt");
assert.equal(convState(conv({ lastActivity: NOW - LEZART_UTAN_MS - 1 }), NOW), "lezart");
// az átadás erősebb jelzés, mint a tétlenség
assert.equal(
  convState(conv({ handedOff: true, lastActivity: NOW - LEZART_UTAN_MS - 1 }), NOW),
  "atadva",
);

// --- áttekintő ---
const ma = conv({
  messages: [
    { role: "user", text: "Szia", at: NOW - 5 * MIN },
    { role: "assistant", text: "Szia!", at: NOW - 5 * MIN + 4000 },
  ],
});
const regi = conv({
  id: "u2",
  lastActivity: NOW - 30 * 24 * 60 * 60 * 1000,
  messages: [{ role: "user", text: "Régi", at: NOW - 30 * 24 * 60 * 60 * 1000 }],
});
const atadott = conv({
  id: "u3",
  handedOff: true,
  messages: [
    { role: "user", text: "Panaszom van", at: NOW - 2 * MIN },
    { role: "assistant", text: "Szólok neki", at: NOW - 2 * MIN + 6000 },
  ],
});

const o = overview([ma, regi, atadott], NOW);
assert.equal(o.today, 2, "csak a ma aktív beszélgetések");
assert.equal(o.week, 2);
assert.equal(o.botHandled, 1, "az átadott nem számít bot által kezeltnek");
assert.equal(o.handedOff, 1);
assert.equal(o.avgResponseMs, 5000, "(4s + 6s) / 2");

// válasz nélküli beszélgetés nem számít se botnak, se átadásnak, és nem rontja az átlagot
const csakBejovo = overview([conv({ messages: [{ role: "user", text: "Hali", at: NOW }] })], NOW);
assert.equal(csakBejovo.botHandled, 0);
assert.equal(csakBejovo.avgResponseMs, null);

// több bejövő üzenet után egy válasz: az ELSŐ bejövőtől mérünk
const halmozott = overview(
  [
    conv({
      messages: [
        { role: "user", text: "a", at: NOW - 10_000 },
        { role: "user", text: "b", at: NOW - 8_000 },
        { role: "assistant", text: "c", at: NOW },
      ],
    }),
  ],
  NOW,
);
assert.equal(halmozott.avgResponseMs, 10_000);

assert.equal(overview([], NOW).avgResponseMs, null);

// --- időtartam ---
assert.equal(duration(4200), "4 másodperc");
assert.equal(duration(90_000), "1 perc 30 másodperc");
assert.equal(duration(120_000), "2 perc");
assert.equal(duration(3 * 3600_000 + 5 * MIN), "3 óra 5 perc");

// rövid alak: csak a legnagyobb egység, hogy elférjen a számlapon
assert.equal(duration(90_000, true), "1 perc");
assert.equal(duration(3 * 3600_000 + 5 * MIN, true), "3 óra");
assert.equal(duration(4200, true), "4 másodperc");

console.log("stats: ok");
