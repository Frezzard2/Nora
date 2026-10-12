/**
 * Egyszer lefuttatható migráció: meglévő Redis-kulcsok átnevezése egy névtérbe.
 *
 *   npm run migrate-prefix -- --to bence
 *   npm run migrate-prefix -- --from nora --to bence
 *   npm run migrate-prefix -- --to bence --yes     (kérdés nélkül)
 *
 * Miért kell: a REDIS_PREFIX bevezetése előtt minden kulcs `nora:` előtaggal
 * készült. Az új kód a saját névterében keres, tehát a régi kulcsokat át kell
 * nevezni — különben a bot úgy indul, mintha üres lenne az adatbázis (a
 * konfigurációt is beleértve).
 *
 * Amit a script SOHA nem tesz: nem töröl, és nem ír felül létező célkulcsot
 * (RENAMENX). Ami ütközne, azt kihagyja és felsorolja.
 */
import { createInterface } from "node:readline/promises";
import { readFileSync } from "node:fs";
import { Redis } from "@upstash/redis";
import { normalizePrefix } from "../lib/keys.ts";

/** .env.local betöltése, ha a változók nincsenek már a környezetben. */
function loadEnvLocal(): void {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key]) continue;
      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* nincs .env.local — a környezetből dolgozunk */
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  loadEnvLocal();

  const from = normalizePrefix(arg("from") ?? "nora");
  const to = normalizePrefix(arg("to") ?? process.env.REDIS_PREFIX);
  const assumeYes = process.argv.includes("--yes");

  if (from === to) {
    console.error(`A forrás és a cél előtag ugyanaz ("${from}") — nincs mit tenni.`);
    process.exit(1);
  }
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error("Hiányzik az UPSTASH_REDIS_REST_URL vagy a UPSTASH_REDIS_REST_TOKEN.");
    process.exit(1);
  }

  const db = Redis.fromEnv();

  // --- 1. Mit találunk? ---
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await db.scan(cursor, { match: `${from}:*`, count: 500 });
    cursor = String(next);
    keys.push(...batch);
  } while (cursor !== "0");

  if (!keys.length) {
    console.log(`Nincs "${from}:*" előtagú kulcs az adatbázisban — nincs mit átnevezni.`);
    return;
  }

  // --- 2. Mit fogunk csinálni? ---
  keys.sort();
  console.log(`\nÁtnevezés: "${from}:*"  ->  "${to}:*"`);
  console.log(`Érintett kulcsok: ${keys.length} db\n`);
  for (const key of keys.slice(0, 40)) {
    console.log(`  ${key}  ->  ${to}:${key.slice(from.length + 1)}`);
  }
  if (keys.length > 40) console.log(`  … és még ${keys.length - 40} kulcs`);
  console.log("\nA script nem töröl semmit, és létező célkulcsot nem ír felül.");

  // --- 3. Rákérdezés ---
  if (!assumeYes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question(`\nMehet ez a ${keys.length} átnevezés? [i/N] `)).trim().toLowerCase();
    rl.close();
    if (answer !== "i" && answer !== "igen" && answer !== "y" && answer !== "yes") {
      console.log("Megszakítva, semmi nem változott.");
      return;
    }
  }

  // --- 4. Átnevezés ---
  let renamed = 0;
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const key of keys) {
    const target = `${to}:${key.slice(from.length + 1)}`;
    try {
      // RENAMENX: csak akkor nevez át, ha a cél még nem létezik
      const ok = await db.renamenx(key, target);
      if (ok) renamed++;
      else skipped.push(key);
    } catch (err) {
      failed.push(`${key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nKész. Átnevezve: ${renamed} kulcs.`);
  if (skipped.length) {
    console.log(`Kihagyva (a cél már létezett, a forrás érintetlen): ${skipped.length}`);
    for (const k of skipped.slice(0, 10)) console.log(`  ${k}`);
  }
  if (failed.length) {
    console.log(`HIBA ${failed.length} kulcsnál:`);
    for (const f of failed.slice(0, 10)) console.log(`  ${f}`);
    process.exitCode = 1;
  }
  if (renamed) {
    console.log(`\nMost állítsd be a deployon: REDIS_PREFIX=${to}`);
  }
}

main().catch((err) => {
  console.error("A migráció elhasalt:", err instanceof Error ? err.message : err);
  process.exit(1);
});
