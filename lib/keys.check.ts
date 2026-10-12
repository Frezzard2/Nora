// Önellenőrzés: node lib/keys.check.ts
import assert from "node:assert/strict";
import { DEFAULT_PREFIX, makeKeys, normalizePrefix, sampleKeys } from "./keys.ts";

// --- előtag normalizálása ---
assert.equal(normalizePrefix("bence"), "bence");
assert.equal(normalizePrefix("  Bence  "), "bence");
assert.equal(normalizePrefix(undefined), DEFAULT_PREFIX, "hiányzó előtagnál nem dőlhet el semmi");
assert.equal(normalizePrefix(""), DEFAULT_PREFIX);
assert.equal(normalizePrefix("   "), DEFAULT_PREFIX);
// a kettőspont kivétele a lényeg: azzal az előtag belelóghatna a másik névterébe
assert.equal(normalizePrefix("a:b"), "a-b");
assert.equal(normalizePrefix("ügyfél 1"), "gyf-l-1");
assert.equal(normalizePrefix("---"), DEFAULT_PREFIX, "csak elválasztóból álló előtag nem érvényes");

// --- minden kulcs a saját előtagjával kezdődik ---
const a = makeKeys("bence");
const b = makeKeys("teszt");

for (const k of sampleKeys(a)) assert.ok(k.startsWith("bence:"), `kilóg a névtérből: ${k}`);
for (const k of sampleKeys(b)) assert.ok(k.startsWith("teszt:"), `kilóg a névtérből: ${k}`);

// --- a két névtér kulcshalmaza diszjunkt ---
const aKeys = new Set(sampleKeys(a));
const bKeys = new Set(sampleKeys(b));
assert.equal(aKeys.size, sampleKeys(a).length, "egy névtéren belül sem ütközhet két kulcs");
for (const k of bKeys) assert.ok(!aKeys.has(k), `két névtér ugyanazt a kulcsot adja: ${k}`);

// --- SCAN-minta csak a sajátját látja ---
const matches = (pattern: string, key: string) => key.startsWith(pattern.replace(/\*$/, ""));
for (const k of sampleKeys(b)) assert.ok(!matches(a.scanPattern, k), `idegen kulcsra illeszkedik: ${k}`);
for (const k of sampleKeys(a)) assert.ok(!matches(b.scanPattern, k), `idegen kulcsra illeszkedik: ${k}`);

// --- az egyik előtag a másik sztring-prefixe: akkor sem szivároghat ---
const s = makeKeys("a");
const sl = makeKeys("ab");
for (const k of sampleKeys(sl)) assert.ok(!matches(s.scanPattern, k), `"a:*" látja az "ab" névteret: ${k}`);
for (const k of sampleKeys(s)) assert.ok(!matches(sl.scanPattern, k), `"ab:*" látja az "a" névteret: ${k}`);

// --- áltároló: amit az egyik névtér ír, azt a másik nem látja ---
const store = new Map<string, string>();
store.set(a.conv("u1"), "bence beszélgetése");
store.set(a.config, "bence konfigurációja");
store.set(a.botSwitch, "off");

assert.equal(store.get(a.conv("u1")), "bence beszélgetése");
assert.equal(store.get(b.conv("u1")), undefined, "ugyanaz a felhasználó-ID, másik névtér — nincs találat");
assert.equal(store.get(b.config), undefined, "a konfiguráció sem szivároghat át");
assert.equal(store.get(b.botSwitch), undefined, "a vészkapcsoló sem közös");

// a másik névtér írása nem írja felül az elsőt
store.set(b.conv("u1"), "teszt beszélgetése");
assert.equal(store.get(a.conv("u1")), "bence beszélgetése");
assert.equal(store.get(b.conv("u1")), "teszt beszélgetése");

// listázás előtaggal: mindenki csak a sajátját kapja
const listed = (keys: { scanPattern: string }) =>
  [...store.keys()].filter((k) => matches(keys.scanPattern, k)).sort();
assert.deepEqual(listed(a), [a.botSwitch, a.config, a.conv("u1")].sort());
assert.deepEqual(listed(b), [b.conv("u1")]);

console.log("keys: ok");
