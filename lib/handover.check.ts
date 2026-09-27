// Önellenőrzés: node lib/handover.check.ts
import assert from "node:assert/strict";
import { parseReply } from "./handover.ts";

assert.deepEqual(parseReply("Szia! Miben segíthetek?"), {
  text: "Szia! Miben segíthetek?",
  handover: false,
});

assert.deepEqual(parseReply("[ATADAS]\nSzólok Annának, ő személyesen válaszol."), {
  text: "Szólok Annának, ő személyesen válaszol.",
  handover: true,
});

// vezető whitespace sem téveszti meg
assert.deepEqual(parseReply("  [ATADAS] Mindjárt szólok neki.  "), {
  text: "Mindjárt szólok neki.",
  handover: true,
});

// a jelölő az üzenet közepén nem átadás
assert.equal(parseReply("Nem tudom, mi az [ATADAS] jelentése.").handover, false);

console.log("handover: ok");
