import { NextResponse, type NextRequest } from "next/server";

/** HTTP Basic: nem kifinomult, de az /admin nem nyilvános. */
export const config = { matcher: "/admin/:path*" };

const challenge = () =>
  new NextResponse("Bejelentkezés szükséges.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Nora admin", charset="UTF-8"' },
  });

/** Konstans idejű összehasonlítás (az edge futtatókörnyezetben nincs node:crypto). */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  // ha nincs beállított jelszó, az oldal zárva marad — soha nem nyitjuk ki
  if (!password) return challenge();

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return challenge();

  try {
    const given = atob(header.slice("Basic ".length)).split(":").slice(1).join(":");
    if (equals(given, password)) return NextResponse.next();
  } catch {
    /* hibás base64 — ugyanaz a válasz, mint a rossz jelszónál */
  }
  return challenge();
}
