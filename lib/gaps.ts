import { normalize } from "./comment-rules.ts";

/**
 * „Amire nem tudott válaszolni" — a bot önjavító köre.
 *
 * Valahányszor a bot átadja a beszélgetést, eltesszük a kérdést, ami kiváltotta.
 * Ezekből derül ki, mi hiányzik a GYIK-ből: nem tippelni kell, hanem a valódi
 * érdeklődők mondják meg, mivel nem boldogul.
 *
 * Tiszta függvények, hogy önellenőrzéssel futtathatók legyenek.
 */

export type Gap = {
  /** az érdeklődő kérdése, ami megakasztotta a botot */
  question: string;
  at: number;
  /** melyik beszélgetésben — hogy meg lehessen nyitni */
  convId: string;
  username?: string;
};

export type GroupedGap = Gap & {
  /** hányszor kérdezték ugyanezt (ékezet- és kisbetű-függetlenül) */
  count: number;
};

/**
 * A csoportosítás kulcsa. A normalizáláson felül az írásjeleket is elhagyjuk:
 * a „Mennyibe kerül havonta?" és a „mennyibe kerul havonta" ugyanaz a kérdés,
 * és írásjel nélkül is annak kell látszania.
 */
const groupKey = (text: string) =>
  normalize(text)
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Ennél hosszabb kérdést nem tárolunk — a lista áttekinthető maradjon. */
export const MAX_QUESTION_LENGTH = 280;

/** Tárolásra alkalmas-e? Üres vagy pár karakteres üzenetből nem lesz GYIK. */
export function isUsefulQuestion(text: string): boolean {
  return normalize(text).length >= 8;
}

/**
 * Azonos kérdések összevonása, a leggyakoribb elöl. Azonos darabszámnál a
 * frissebb nyer — így a most futó kampány kérdései kerülnek felülre.
 */
export function groupGaps(gaps: Gap[]): GroupedGap[] {
  const byQuestion = new Map<string, GroupedGap>();

  for (const gap of gaps) {
    const key = groupKey(gap.question);
    if (!key) continue;

    const seen = byQuestion.get(key);
    if (!seen) {
      byQuestion.set(key, { ...gap, count: 1 });
      continue;
    }
    seen.count++;
    // a legfrissebb előfordulás adatait tartjuk meg, hogy oda lehessen ugrani
    if (gap.at > seen.at) {
      seen.at = gap.at;
      seen.convId = gap.convId;
      seen.username = gap.username;
      seen.question = gap.question;
    }
  }

  return [...byQuestion.values()].sort((a, b) => b.count - a.count || b.at - a.at);
}
