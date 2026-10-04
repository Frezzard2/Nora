import type { NoraConfig } from "./types";

/**
 * Üzembe állás előtti ellenőrzések. Két helyen kell: a válaszlogika ezzel áll
 * meg, ha a konfig még nincs kitöltve, az admin felület pedig ezt mutatja meg.
 */

const ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "IG_VERIFY_TOKEN",
  "IG_APP_SECRET",
  "IG_ACCESS_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "ADMIN_PASSWORD",
] as const;

/** A hiányzó környezeti változók nevei (értéket soha nem adunk vissza). */
export function envGaps(): string[] {
  return ENV_KEYS.filter((k) => !process.env[k]?.trim());
}

/**
 * A config/client.json-ból hiányzó, válaszadáshoz elengedhetetlen mezők.
 * Ezek nélkül az AI csak általánosságokat tud írni — éles fiókon ez kínos.
 */
export function configGaps(c: NoraConfig): string[] {
  // A példakonfig PLACEHOLDER szövegeket tartalmaz (ár, link). Ha valaki
  // átírás nélkül élesíti, inkább ne válaszoljunk, mint hogy az érdeklődő
  // megkapja a „PLACEHOLDER — írd át" szöveget.
  const missing = (v: string) => !v.trim() || v.includes("PLACEHOLDER");

  const gaps: string[] = [];
  if (missing(c.alapok.nev) && missing(c.alapok.markanev)) gaps.push("alapok.nev vagy markanev");
  if (missing(c.alapok.kinekMibenSegit)) gaps.push("alapok.kinekMibenSegit");
  if (missing(c.ajanlat.foSzolgaltatas)) gaps.push("ajanlat.foSzolgaltatas");
  if (missing(c.ajanlat.ar) && c.ajanlat.arElarulhato) gaps.push("ajanlat.ar");
  if (missing(c.ajanlat.celLink)) gaps.push("ajanlat.celLink");
  return gaps;
}
