"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  anyPasswordSet,
  roleForPassword,
  tokenFor,
} from "@/lib/session";

export type LoginState = { error?: string };

/** Csak a saját oldalunkra engedünk visszairányítást — különben nyílt átirányítás. */
const safeNext = (value: unknown) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/admin";

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!anyPasswordSet()) {
    return {
      error:
        "Még nincs beállítva jelszó ehhez a felülethez. Szólj az üzemeltetőnek — nélküle nem tudunk beléptetni.",
    };
  }

  const password = form.get("jelszo");
  const role = typeof password === "string" ? await roleForPassword(password) : null;
  if (!role) {
    // ugyanaz a szöveg rossz jelszónál és üres mezőnél — ne segítsünk a találgatásban
    return { error: "Hibás jelszó. Próbáld újra." };
  }

  const token = await tokenFor(role);
  if (!token) return { error: "A bejelentkezés most nem sikerült. Próbáld újra kicsit később." };

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(safeNext(form.get("tovabb")));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/belepes");
}
