"use server";

import { revalidatePath } from "next/cache";
import { conversationExists, setBotEnabled, update } from "@/lib/store";

/**
 * Beszélgetés-szintű kapcsoló. Visszakapcsoláskor az átadást is feloldjuk.
 * Csak már létező beszélgetést módosít: hiányzó vagy hamisított id-vel
 * különben üres szemét-rekord keletkezne a tárolóban.
 */
export async function toggleConversation(form: FormData) {
  const raw = form.get("id");
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id || !(await conversationExists(id))) {
    console.warn("[admin] Ismeretlen beszélgetés-id, a kapcsoló nem futott le.");
    return;
  }

  const on = form.get("on") === "1";
  await update(id, (c) => ({ ...c, botEnabled: on, handedOff: on ? false : c.handedOff }));
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
}

/** Globális vészkapcsoló. */
export async function toggleGlobal(form: FormData) {
  await setBotEnabled(form.get("on") === "1");
  revalidatePath("/admin");
}
