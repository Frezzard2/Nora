import fileConfig from "@/config/client.json";
import { getStoredConfig } from "./store";
import { mergeConfig, type NoraConfig } from "./types";

/**
 * Az ügyfél konfigurációja, három forrásból — ebben a sorrendben:
 *
 * 1. amit az /onboarding varázslóból mentettek (Redis) — ez a szándékos, friss
 * 2. a NORA_CONFIG env változó — ha a felületet nem használják
 * 3. config/client.json — helyi fejlesztéshez
 *
 * Szándékosan NEM gyorsítótárazzuk: mentés után a következő üzenet már az új
 * konfigurációval menjen. Üzenetenként egy Redis GET, a többi olvasás mellett elhanyagolható.
 */
export type ConfigSource = "felület" | "NORA_CONFIG" | "config/client.json";

export type ResolvedConfig = {
  config: NoraConfig;
  source: ConfigSource;
  /** emberi hibaszöveg, ha a NORA_CONFIG nem volt feldolgozható */
  error?: string;
};

const FROM_FILE = fileConfig as unknown as NoraConfig;

function fromEnv(): ResolvedConfig | null {
  const raw = process.env.NORA_CONFIG?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("a JSON nem objektum");
    }
    return { config: mergeConfig(parsed), source: "NORA_CONFIG" };
  } catch (err) {
    const error = `A NORA_CONFIG nem érvényes JSON (${
      err instanceof Error ? err.message : "ismeretlen hiba"
    }) — a config/client.json-t használom.`;
    console.error(`[nora] ${error}`);
    return { config: FROM_FILE, source: "config/client.json", error };
  }
}

export async function clientConfig(): Promise<ResolvedConfig> {
  const stored = await getStoredConfig<NoraConfig>();
  if (stored) return { config: mergeConfig(stored), source: "felület" };

  return fromEnv() ?? { config: FROM_FILE, source: "config/client.json" };
}
