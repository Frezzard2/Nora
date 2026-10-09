import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, roleFromCookie, type Role } from "./session";

/**
 * A bejelentkezett szerep. A middleware már kiszűrte a be nem léptetett kérést,
 * ez a második kapu — ha egy oldal kimaradna a matcherből, akkor se szivárogjon ki.
 */
export async function currentRole(): Promise<Role> {
  const role = await roleFromCookie((await cookies()).get(SESSION_COOKIE)?.value);
  if (!role) redirect("/belepes");
  return role;
}
