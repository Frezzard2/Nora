// Önellenőrzés: node lib/limits.check.ts
import assert from "node:assert/strict";
import { DEFAULT_DAILY_COST_LIMIT_USD, dailyCostLimitUsd, overDailyCostLimit } from "./limits.ts";

// --- a plafon beolvasása ---
assert.equal(dailyCostLimitUsd("5"), 5);
assert.equal(dailyCostLimitUsd("0.5"), 0.5);
assert.equal(dailyCostLimitUsd(" 3 "), 3);
assert.equal(dailyCostLimitUsd(undefined), DEFAULT_DAILY_COST_LIMIT_USD, "nincs megadva → alapértelmezés");
assert.equal(dailyCostLimitUsd(""), DEFAULT_DAILY_COST_LIMIT_USD);

// Elgépelés vagy negatív érték NEM kapcsolhatja ki a védelmet — ez pénzbe kerülne.
assert.equal(dailyCostLimitUsd("nagyon sok"), DEFAULT_DAILY_COST_LIMIT_USD);
assert.equal(dailyCostLimitUsd("-1"), DEFAULT_DAILY_COST_LIMIT_USD);
assert.equal(dailyCostLimitUsd("Infinity"), DEFAULT_DAILY_COST_LIMIT_USD, "a végtelen nem plafon");
assert.equal(dailyCostLimitUsd("NaN"), DEFAULT_DAILY_COST_LIMIT_USD);

// A 0 viszont érvényes szándék: „ma egy centet sem."
assert.equal(dailyCostLimitUsd("0"), 0);
assert.equal(overDailyCostLimit(0, 0), true, "0 plafonnál már az első hívás sem mehet");

// --- a plafon döntése ---
assert.equal(overDailyCostLimit(0, 2), false, "üres nap: mehet");
assert.equal(overDailyCostLimit(1.9999, 2), false, "plafon alatt: mehet");
assert.equal(overDailyCostLimit(2, 2), true, "PONTOSAN a plafonon: már nem megy");
assert.equal(overDailyCostLimit(2.5, 2), true, "plafon fölött: nem megy");

// hibás tároló-érték ne némítsa el a botot csendben
assert.equal(overDailyCostLimit(Number.NaN, 2), false, "olvashatatlan költség nem állíthatja le a botot");

// --- egy nap tipikus lefutása: a plafon tényleg megfog egy elszabadult kört ---
const LIMIT = 2;
const PER_REPLY = 0.034; // a mért átlag egy beszélgetésre
let spent = 0;
let replies = 0;
while (!overDailyCostLimit(spent, LIMIT)) {
  spent += PER_REPLY;
  replies++;
  assert.ok(replies < 1000, "a ciklusnak meg KELL állnia — különben nincs plafon");
}
assert.ok(replies >= 58 && replies <= 60, `~59 válasz fér bele, kaptunk: ${replies}`);
assert.ok(spent < LIMIT + PER_REPLY, "a túllépés legfeljebb egy válasznyi lehet");

console.log("limits: ok");
