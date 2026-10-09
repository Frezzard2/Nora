/**
 * A komment-szabályok illesztése. Tiszta függvények, szándékosan szerver-független:
 * az admin felület (kliens) és a webhook-feldolgozás is ugyanezt használja, és így
 * önellenőrzéssel futtatható — lásd comments.check.ts.
 */
import { MINDEN_POSZT, type CommentRule } from "./types.ts";

/** Kisbetűs, ékezet nélküli alak — így a „Arat" és az „árat" is egyezik. */
export const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Az első illeszkedő, bekapcsolt szabály — vagy null, ha egy sem illeszkedik.
 * Kulcsszó nélküli szabály SOHA nem illeszkedik: különben egy üresen hagyott
 * szabály minden kommentre válaszolna.
 */
export function matchRule(
  rules: CommentRule[],
  comment: { text: string; mediaId?: string },
): CommentRule | null {
  const haystack = normalize(comment.text ?? "");
  if (!haystack) return null;

  return (
    (Array.isArray(rules) ? rules : []).find((r) => {
      if (!r.be) return false;

      const poszt = (r.poszt ?? "").trim();
      const posztOk = !poszt || poszt === MINDEN_POSZT || poszt === comment.mediaId;
      if (!posztOk) return false;

      // a konfiguráció kézzel is szerkeszthető (NORA_CONFIG, client.json) — hiányzó
      // mező ne dobjon kivételt, csak ne illeszkedjen
      const keywords = (Array.isArray(r.kulcsszavak) ? r.kulcsszavak : [])
        .map(normalize)
        .filter(Boolean);
      return keywords.length > 0 && keywords.some((k) => haystack.includes(k));
    }) ?? null
  );
}

/** Véletlen változat a nyilvános válaszhoz — hogy ne tűnjön robotnak. */
export function pickPublic(rule: CommentRule): string | null {
  const options = (Array.isArray(rule.nyilvanosValaszok) ? rule.nyilvanosValaszok : [])
    .map((t) => String(t).trim())
    .filter(Boolean);
  if (!options.length) return null;
  return options[Math.floor(Math.random() * options.length)];
}
