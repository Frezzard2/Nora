import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, roleFromCookie } from "@/lib/session";

/**
 * Munkamenet-süti a nem nyilvános felületek előtt.
 *
 * Nyilvános marad: a főoldal, az /adatvedelem (a Meta app publikálásához kell),
 * az /api/webhook (a Meta hívja, saját aláírás-ellenőrzéssel) és a /belepes.
 *
 * Az /api/reply és a /simulator azért van bent, mert fizetett AI-hívást
 * indítanak — nyilvános deployon enélkül bárki égethetné a kvótát.
 */
export const config = {
  matcher: ["/admin/:path*", "/onboarding/:path*", "/simulator/:path*", "/api/config", "/api/reply"],
};

/** Fejlesztői eszközök: ezeket az ügyfél nem látja, csak a tulajdonos. */
const OWNER_ONLY = ["/onboarding", "/simulator", "/api/reply"];

export async function middleware(req: NextRequest) {
  const role = await roleFromCookie(req.cookies.get(SESSION_COOKIE)?.value);
  const path = req.nextUrl.pathname;

  if (!role) {
    // API-hívásnál nincs értelme átirányításnak — a kliens kódja kezelje
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "A munkamenet lejárt. Jelentkezz be újra." }, { status: 401 });
    }
    const login = new URL("/belepes", req.url);
    if (path !== "/admin") login.searchParams.set("tovabb", path);
    return NextResponse.redirect(login);
  }

  if (role !== "owner" && OWNER_ONLY.some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}
