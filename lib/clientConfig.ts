import fileConfig from "@/config/client.json";
import type { NoraConfig } from "./types";

/**
 * Az ügyfél konfigurációja.
 *
 * Elsősorban a NORA_CONFIG env változóból — így új ügyfélhez elég egy új Vercel
 * projekt a megfelelő env változókkal, a repóhoz nem kell hozzányúlni.
 * Ha nincs beállítva, a config/client.json-ból (ez a kényelmes út helyi fejlesztéshez).
 */
export type ResolvedConfig = {
  config: NoraConfig;
  source: "env" | "file";
  /** emberi hibaszöveg, ha a NORA_CONFIG nem volt feldolgozható */
  error?: string;
};

const FROM_FILE = fileConfig as unknown as NoraConfig;

function resolve(): ResolvedConfig {
  const raw = process.env.NORA_CONFIG?.trim();
  if (!raw) return { config: FROM_FILE, source: "file" };

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("a JSON nem objektum");
    }
    // Hiányos JSON-nál a configGaps amúgy is megállítja a válaszadást, ezért
    // itt nem sémát validálunk — csak azt, hogy egyáltalán értelmezhető.
    return { config: parsed as NoraConfig, source: "env" };
  } catch (err) {
    const error = `A NORA_CONFIG nem érvényes JSON (${
      err instanceof Error ? err.message : "ismeretlen hiba"
    }) — a config/client.json-t használom.`;
    console.error(`[nora] ${error}`);
    return { config: FROM_FILE, source: "file", error };
  }
}

let cached: ResolvedConfig | null = null;

/** Memoizált: egy lambda-példány életében egyszer dolgozzuk fel. */
export const clientConfig = (): ResolvedConfig => (cached ??= resolve());
