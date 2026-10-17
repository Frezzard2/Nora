// Önellenőrzés: node lib/checklist.check.ts
import assert from "node:assert/strict";
import { errorCount, readinessChecks, visibleTo, type ChecklistInput } from "./checklist.ts";
import { emptyConfig, emptyRule, type NoraConfig } from "./types.ts";

/** Teljesen kitöltött, egészséges konfiguráció — ebből indulunk. */
function jóConfig(): NoraConfig {
  const c = emptyConfig();
  c.alapok = { nev: "Teszt Elek", markanev: "Teszt", kinekMibenSegit: "Segítek valamiben.", nyelv: "magyar" };
  c.ajanlat = { foSzolgaltatas: "Szolgáltatás", ar: "100 000 Ft", arElarulhato: true, cel: "hivas", celLink: "https://pelda.hu" };
  c.gyik = [
    { q: "Mennyi ideig tart?", a: "30 perc." },
    { q: "Mit tartalmaz?", a: "Ezt meg azt." },
    { q: "Van garancia?", a: "Igen." },
  ];
  c.hatarok.sohaNeMondja = "Ne ígérj garantált eredményt.";
  return c;
}

const alap = (patch: Partial<ChecklistInput> = {}): ChecklistInput => ({
  config: jóConfig(),
  accountPinned: true,
  pushConfigured: true,
  pushSubs: 1,
  ...patch,
});

const ids = (i: ChecklistInput) => readinessChecks(i).map((c) => c.id);

// --- egészséges beállításnál nincs teendő ---
assert.deepEqual(ids(alap()), [], "kitöltött konfigurációnál üres a lista");

// --- üres GYIK: ez okozta a kitalált „kb. 30 perc"-et ---
const ures = jóConfig(); ures.gyik = [];
assert.ok(ids(alap({ config: ures })).includes("gyik-ures"));
assert.equal(errorCount(readinessChecks(alap({ config: ures }))), 1, "az üres GYIK valódi hiba");

// a félig kitöltött csak ajánlás
const keves = jóConfig(); keves.gyik = [{ q: "Egy?", a: "Igen." }];
const kevesChecks = readinessChecks(alap({ config: keves }));
assert.ok(kevesChecks.some((c) => c.id === "gyik-keves"));
assert.equal(errorCount(kevesChecks), 0, "a kevés GYIK nem hiba, csak ajánlás");

// üres kérdés-válasz pár nem számít kitöltöttnek
const latszolag = jóConfig(); latszolag.gyik = [{ q: "  ", a: "  " }];
assert.ok(ids(alap({ config: latszolag })).includes("gyik-ures"));

// --- ár-politika: Máté beszélgetése ezen halt el ---
const arNelkul = jóConfig(); arNelkul.ajanlat.ar = ""; arNelkul.ajanlat.arElarulhato = false;
assert.ok(ids(alap({ config: arNelkul })).includes("ar-politika"));

// ha elárulható, csak az alapadat-hiány számít (azt a configGaps fogja)
const arUresDeElarulhato = jóConfig(); arUresDeElarulhato.ajanlat.ar = ""; arUresDeElarulhato.ajanlat.arElarulhato = true;
assert.ok(!ids(alap({ config: arUresDeElarulhato })).includes("ar-politika"));

// --- komment-szabályok ---
const szabalyos = (patch: Partial<ReturnType<typeof emptyRule>>) => {
  const c = jóConfig();
  c.commentRules = [{ ...emptyRule(), nev: "Teszt", kulcsszavak: ["mennyibe"], nyilvanosValaszok: ["Írtam!"], ...patch }];
  return c;
};
assert.deepEqual(ids(alap({ config: szabalyos({}) })), [], "ép szabálynál nincs teendő");

const r1 = readinessChecks(alap({ config: szabalyos({ kulcsszavak: [] }) }));
assert.ok(r1.some((c) => c.id.startsWith("szabaly-kulcsszo")), "kulcsszó nélküli szabály hiba");

const r2 = readinessChecks(alap({ config: szabalyos({ kulcsszavak: ["ár"] }) }));
assert.ok(r2.some((c) => c.id.startsWith("szabaly-rovid")), "a rövid kulcsszó hiba");

const r3 = readinessChecks(alap({ config: szabalyos({ nyilvanosValaszok: [] }) }));
assert.ok(r3.some((c) => c.id.startsWith("szabaly-nyilvanos")));
assert.equal(errorCount(r3), 0, "a hiányzó nyilvános válasz csak ajánlás");

// kikapcsolt szabályt nem ellenőrzünk
assert.deepEqual(ids(alap({ config: szabalyos({ be: false, kulcsszavak: [] }) })), []);

// --- értesítés ---
assert.ok(ids(alap({ pushSubs: 0 })).includes("nincs-ertesites"));
assert.ok(
  !ids(alap({ pushConfigured: false, pushSubs: 0 })).includes("nincs-ertesites"),
  "ha nincs is beállítva a push, ne kérjük számon",
);

// --- technikai tétel csak a tulajdonosnak ---
const technikai = readinessChecks(alap({ accountPinned: false }));
assert.ok(technikai.some((c) => c.id === "ig-account-id"));
assert.ok(visibleTo(technikai, true).some((c) => c.id === "ig-account-id"), "a tulajdonos látja");
assert.ok(!visibleTo(technikai, false).some((c) => c.id === "ig-account-id"), "az ügyfél nem látja");

// --- Bence VALÓDI konfigurációja: minden ismert baja jöjjön elő ---
const bence = emptyConfig();
bence.alapok = { nev: "Stomp Bence", markanev: "Bence", kinekMibenSegit: "Némettudás beszédkészséggé.", nyelv: "magyar" };
bence.ajanlat = { foSzolgaltatas: "Némettanulás", ar: "", arElarulhato: false, cel: "hivas", celLink: "https://pelda.hu" };
bence.gyik = [];
bence.commentRules = [{ ...emptyRule(), nev: "kezdés", kulcsszavak: ["kezdés"], nyilvanosValaszok: [] }];
const bChecks = readinessChecks({ config: bence, accountPinned: false, pushConfigured: true, pushSubs: 0 });
const bIds = bChecks.map((c) => c.id);
for (const kell of ["gyik-ures", "ar-politika", "nincs-ertesites", "ig-account-id"]) {
  assert.ok(bIds.includes(kell), `hiányzik a lista: ${kell}`);
}
assert.ok(bIds.some((i) => i.startsWith("szabaly-nyilvanos")));
assert.equal(errorCount(bChecks), 2, "nála két valódi hiba van: üres GYIK és ár-politika");

console.log("checklist: ok");
