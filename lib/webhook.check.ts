// Önellenőrzés: node lib/webhook.check.ts
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { chunk } from "./chunk.ts";
import { verifySignature } from "./signature.ts";

// --- aláírás ---
const secret = "titkos";
const body = Buffer.from('{"object":"instagram","entry":[]}', "utf8");
const good = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

assert.equal(verifySignature(body, good, secret), true);
assert.equal(verifySignature(body, good, "mas-secret"), false, "rossz kulcs nem mehet át");
assert.equal(verifySignature(Buffer.from("{}"), good, secret), false, "módosított body kiesik");
assert.equal(verifySignature(body, null, secret), false, "fejléc nélkül nincs átjárás");
assert.equal(verifySignature(body, good, ""), false, "üres secret nem engedhet át");
// rövidebb/hosszabb digest ne dobjon kivételt a timingSafeEqual-ban
assert.equal(verifySignature(body, "sha256=abcd", secret), false);
assert.equal(verifySignature(body, good.replace("sha256=", "sha1="), secret), false);

// --- darabolás ---
assert.deepEqual(chunk("rövid"), ["rövid"]);
assert.deepEqual(chunk(""), []);

const long = "szó ".repeat(400).trim(); // 1599 karakter
const parts = chunk(long);
assert.ok(parts.length > 1, "1000 karakter felett darabolni kell");
assert.ok(
  parts.every((p) => p.length <= 1000),
  "egyetlen darab se lehet hosszabb a limitnél",
);
assert.equal(parts.join(" "), long, "a darabok összeolvasva az eredetit adják");

// szóhatár nélküli szöveg: kényszerített vágás, de a limit tartva
const wall = "a".repeat(2500);
assert.deepEqual(
  chunk(wall).map((p) => p.length),
  [1000, 1000, 500],
);

console.log("webhook: ok");
