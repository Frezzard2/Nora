import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A Meta X-Hub-Signature-256 fejlécének ellenőrzése: HMAC SHA-256 a NYERS
 * (parse-olatlan) bodyn, kulcsként az app secret. Időzítésbiztos összehasonlítás.
 */
export function verifySignature(raw: Buffer, header: string | null, secret: string): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(raw).digest();
  const got = Buffer.from(header.slice("sha256=".length), "hex");

  // a timingSafeEqual egyező hosszt követel, ezért előbb a hosszt nézzük
  return got.length === expected.length && timingSafeEqual(got, expected);
}
