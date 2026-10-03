"use server";

import { revalidatePath } from "next/cache";
import { setBotEnabled, update } from "@/lib/store";

/** Beszélgetés-szintű kapcsoló. Visszakapcsoláskor az átadást is feloldjuk. */
export async function toggleConversation(form: FormData) {
  const id = String(form.get("id"));
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
