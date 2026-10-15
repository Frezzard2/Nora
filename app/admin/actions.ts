"use server";

import { revalidatePath } from "next/cache";
import { currentRole } from "@/lib/auth";
import { configGaps } from "@/lib/readiness";
import {
  clearEntryIds,
  clearGaps,
  conversationExists,
  setBotEnabled,
  setStoredConfig,
  update,
} from "@/lib/store";
import { mergeConfig } from "@/lib/types";

/** Minden olyan oldal, ahol a beszélgetések állapota látszik. */
function refreshConversations(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/beszelgetesek");
  if (id) revalidatePath(`/admin/beszelgetesek/${id}`);
}

/**
 * Beszélgetés-szintű kapcsoló. Visszakapcsoláskor az átadást is feloldjuk.
 * Csak már létező beszélgetést módosít: hiányzó vagy hamisított id-vel
 * különben üres szemét-rekord keletkezne a tárolóban.
 */
export async function toggleConversation(form: FormData) {
  await currentRole();

  const raw = form.get("id");
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id || !(await conversationExists(id))) {
    console.warn("[admin] Ismeretlen beszélgetés-id, a kapcsoló nem futott le.");
    return;
  }

  const on = form.get("on") === "1";
  await update(id, (c) => ({ ...c, botEnabled: on, handedOff: on ? false : c.handedOff }));
  refreshConversations(id);
}

/** „Átadom embernek" — a bot azonnal elhallgat ezen a beszélgetésen. */
export async function handOver(form: FormData) {
  await currentRole();

  const raw = form.get("id");
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id || !(await conversationExists(id))) {
    console.warn("[admin] Ismeretlen beszélgetés-id, az átadás nem futott le.");
    return;
  }

  await update(id, (c) => ({ ...c, handedOff: true }));
  refreshConversations(id);
}

/**
 * Fiók figyelmen kívül hagyása. A saját személyes Instagram fiókodra kell: onnan
 * írt üzenet valódi DM-ként érkezik, a visszhang-szűrés nem fogja meg, és a bot
 * válaszolna rá. Figyelmen kívül hagyva az üzenetet nem is tároljuk.
 */
export async function toggleIgnore(form: FormData) {
  await currentRole();

  const raw = form.get("id");
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id || !(await conversationExists(id))) {
    console.warn("[admin] Ismeretlen beszélgetés-id, a kapcsoló nem futott le.");
    return;
  }

  const on = form.get("on") === "1";
  await update(id, (c) => ({ ...c, ignored: on }));
  refreshConversations(id);
}

/** Globális vészkapcsoló — csak a tulajdonos kapcsolhatja. */
export async function toggleGlobal(form: FormData) {
  if ((await currentRole()) !== "owner") {
    console.warn("[admin] A globális vészkapcsolóhoz tulajdonosi hozzáférés kell.");
    return;
  }
  await setBotEnabled(form.get("on") === "1");
  refreshConversations();
}

/**
 * A megfigyelt fiók-azonosítók nullázása. Akkor kell, ha a Meta dashboardon
 * átállítottad, melyik fiók van a webhookra kötve: utána ebből derül ki, hogy
 * tényleg csak a saját fiókodról érkezik-e esemény.
 */
export async function resetAccountIds() {
  if ((await currentRole()) !== "owner") {
    console.warn("[admin] A fiók-lista nullázásához tulajdonosi hozzáférés kell.");
    return;
  }
  await clearEntryIds();
  console.info("[admin] A megfigyelt fiók-azonosítók törölve.");
  revalidatePath("/admin");
}

/**
 * „Amire nem tudott válaszolni" lista kiürítése. Akkor kell, ha a kérdéseket
 * már felvettétek a GYIK-be — utána tiszta lappal gyűlnek az újak.
 */
export async function clearAnswerGaps() {
  await currentRole();
  await clearGaps();
  console.info("[admin] A megválaszolatlan kérdések listája kiürítve.");
  revalidatePath("/admin");
}

export type SaveResult = { ok: boolean; gaps?: string[]; error?: string };

/**
 * A konfiguráció mentése a tárolóba. A clientConfig() szándékosan nem
 * gyorsítótáraz, ezért a következő üzenet már ezzel megy ki — újradeploy nélkül.
 */
export async function saveClientConfig(input: unknown): Promise<SaveResult> {
  await currentRole();

  try {
    // a hiányzó mezőket az üres alapértelmezéssel tölti fel, így nem dob hibát később
    const config = mergeConfig(input);
    const gaps = configGaps(config);

    await setStoredConfig(config);
    console.info(`[admin] Konfiguráció mentve${gaps.length ? ` (hiányos: ${gaps.join(", ")})` : ""}.`);

    revalidatePath("/admin");
    revalidatePath("/admin/beallitasok");
    revalidatePath("/admin/kommentek");
    return { ok: true, gaps };
  } catch (err) {
    // a nyers hibát csak a naplóba írjuk, az ügyfél emberi szöveget kap
    console.error("[admin] A mentés elhasalt:", err instanceof Error ? err.message : err);
    return {
      ok: false,
      error: "A mentés most nem sikerült. Próbáld újra — ha másodszor sem megy, szólj nekünk.",
    };
  }
}
