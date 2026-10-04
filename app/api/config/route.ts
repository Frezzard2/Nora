import { NextResponse } from "next/server";
import { configGaps } from "@/lib/readiness";
import { getStoredConfig, setStoredConfig } from "@/lib/store";
import { mergeConfig, type NoraConfig } from "@/lib/types";

export const runtime = "nodejs";

/** A middleware jelszóval védi ezt az útvonalat — lásd middleware.ts */

/** A felületen éppen élő konfiguráció, hogy a varázsló azt tudja szerkeszteni. */
export async function GET() {
  return NextResponse.json({ config: await getStoredConfig<NoraConfig>() });
}

/** Ennél nagyobb konfigurációnak nincs értelme — ne lehessen a tárolót teletölteni. */
const MAX_BYTES = 200_000;

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BYTES) {
    return NextResponse.json({ error: "A konfiguráció túl nagy." }, { status: 413 });
  }

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Hibás JSON." }, { status: 400 });
  }

  // a hiányzó mezőket az üres alapértelmezéssel tölti fel, így nem dob hibát később
  const config = mergeConfig(input);
  const gaps = configGaps(config);

  await setStoredConfig(config);
  console.info(`[nora] Konfiguráció mentve a felületről${gaps.length ? ` (hiányos: ${gaps.join(", ")})` : ""}.`);

  // mentünk akkor is, ha hiányos — de megmondjuk, mi kell még a válaszadáshoz
  return NextResponse.json({ ok: true, gaps });
}
