import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { generateReply, type IncomingMessage } from "@/lib/reply-engine";
import type { NoraConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { config?: NoraConfig; history?: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Hibás kérés." }, { status: 400 });
  }

  const { config, history } = body;
  if (!config || !Array.isArray(history) || history.length === 0) {
    return NextResponse.json({ error: "Hiányzó konfiguráció vagy üzenet." }, { status: 400 });
  }
  if (history.length > 100) {
    return NextResponse.json({ error: "Túl hosszú beszélgetés." }, { status: 400 });
  }

  try {
    return NextResponse.json(await generateReply(config, history));
  } catch (err) {
    console.error("reply-engine", err);

    // Az SDK több hitelesítési forrást is elfogad (API kulcs, auth token,
    // workload identity federation, `ant auth login` profil), ezért nem
    // env-változóra szűrünk előre, hanem a tényleges hitelesítési hibát kezeljük.
    // Hiányzó hitelesítés esetén az SDK sima Error-t dob, nem APIError-t.
    const missingAuth =
      err instanceof Error && err.message.startsWith("Could not resolve authentication method");

    if (missingAuth || err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        {
          error:
            "Sikertelen hitelesítés. Állíts be ANTHROPIC_API_KEY-t a .env.local-ban, " +
            "vagy használj workload identity federationt.",
        },
        { status: 401 },
      );
    }
    // A 400-as hibák általában konkrétan megmondják, mi a baj (pl. hiányzó
    // workspace id, nem létező modell) — ezt érdemes továbbadni a felületre.
    if (err instanceof Anthropic.BadRequestError) {
      const detail = (err.error as { error?: { message?: string } } | undefined)?.error?.message;
      return NextResponse.json({ error: detail ?? "Hibás kérés az API felé." }, { status: 400 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Túl sok kérés egymás után. Várj pár másodpercet, és próbáld újra." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "Nem sikerült választ generálni. Nézd meg a szerver naplóját." },
      { status: 502 },
    );
  }
}
