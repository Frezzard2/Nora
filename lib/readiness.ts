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
  const gaps: string[] = [];
  if (!c.alapok.nev.trim() && !c.alapok.markanev.trim()) gaps.push("alapok.nev vagy markanev");
  if (!c.alapok.kinekMibenSegit.trim()) gaps.push("alapok.kinekMibenSegit");
  if (!c.ajanlat.foSzolgaltatas.trim()) gaps.push("ajanlat.foSzolgaltatas");
  if (!c.ajanlat.celLink.trim()) gaps.push("ajanlat.celLink");
  return gaps;
}
