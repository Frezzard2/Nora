import { configGaps, gapSentence } from "./readiness.ts";
import type { NoraConfig } from "./types.ts";

/**
 * Indulási ellenőrzőlista.
 *
 * A hét minden éles hibája hiányos konfigurációból jött: a bot kitalált egy
 * időtartamot (üres GYIK), némán hagyott egy ár-kérdést (nincs ár és nem is
 * elárulható), és a posztok alatt semmi nem látszott (nincs nyilvános válasz).
 * A rendszer mindezt tudta — csak nem mondta meg senkinek.
 *
 * Tiszta függvények, hogy önellenőrzéssel futtathatók legyenek.
 */

export type CheckLevel =
  /** emiatt rosszul viselkedik a bot éles beszélgetésben */
  | "hiba"
  /** működik nélküle is, de érdemes */
  | "ajanlott";

export type Check = {
  id: string;
  level: CheckLevel;
  title: string;
  detail: string;
  /** technikai tétel: az ügyfél úgysem tudja megoldani */
  ownerOnly?: boolean;
  href?: string;
};

export type ChecklistInput = {
  config: NoraConfig;
  /** be van-e állítva az IG_ACCOUNT_ID */
  accountPinned: boolean;
  /** van-e VAPID kulcspár a deployon */
  pushConfigured: boolean;
  /** hány eszköz kér értesítést */
  pushSubs: number;
};

const BEALLITASOK = "/admin/beallitasok";
const KOMMENTEK = "/admin/kommentek";

export function readinessChecks(input: ChecklistInput): Check[] {
  const { config: c } = input;
  const out: Check[] = [];

  // --- a válaszadás alapfeltételei ---
  const gaps = configGaps(c);
  if (gaps.length) {
    out.push({
      id: "alapadatok",
      level: "hiba",
      title: "Hiányzó alapadatok",
      detail: `A bot addig egyáltalán nem válaszol. Hiányzik: ${gapSentence(gaps)}.`,
      href: BEALLITASOK,
    });
  }

  // --- ez okozta a kitalált „kb. 30 perc"-et ---
  const gyik = c.gyik.filter((f) => f.q.trim() && f.a.trim()).length;
  if (gyik === 0) {
    out.push({
      id: "gyik-ures",
      level: "hiba",
      title: "Nincs egyetlen gyakori kérdés sem",
      detail:
        "Ha olyat kérdeznek, amire nincs válaszod megadva, a bot hajlamos kitalálni egyet. " +
        "Írd meg azt az 5-6 kérdést, amit százszor megkapsz.",
      href: BEALLITASOK,
    });
  } else if (gyik < 3) {
    out.push({
      id: "gyik-keves",
      level: "ajanlott",
      title: `Csak ${gyik} gyakori kérdés van megadva`,
      detail: "Minél több valódi kérdés van benne, annál ritkábban kell emberhez fordulnia.",
      href: BEALLITASOK,
    });
  }

  // --- Máté beszélgetése pontosan ezen halt el ---
  if (!c.ajanlat.ar.trim() && !c.ajanlat.arElarulhato) {
    out.push({
      id: "ar-politika",
      level: "hiba",
      title: "Az ár-kérdésre nincs mit mondania",
      detail:
        "Nincs megadva ár, és azt sem mondhatja el. Ha valaki rákérdez, a bot kénytelen kitérni " +
        "vagy átadni. Adj meg egy árat vagy sávot, vagy írd meg GYIK-válaszként, mikor derül ki az ár.",
      href: BEALLITASOK,
    });
  }

  // --- komment-szabályok ---
  for (const [i, rule] of c.commentRules.entries()) {
    if (!rule.be) continue;
    const nev = rule.nev.trim() || `${i + 1}. szabály`;

    if (!rule.kulcsszavak.filter((k) => k.trim()).length) {
      out.push({
        id: `szabaly-kulcsszo-${rule.id}`,
        level: "hiba",
        title: `A(z) „${nev}" szabály soha nem fut le`,
        detail: "Nincs megadva kulcsszó, így egyetlen kommentre sem illeszkedik.",
        href: KOMMENTEK,
      });
    }
    if (rule.kulcsszavak.some((k) => k.trim().length > 0 && k.trim().length < 3)) {
      out.push({
        id: `szabaly-rovid-${rule.id}`,
        level: "hiba",
        title: `A(z) „${nev}" szabályban túl rövid kulcsszó van`,
        detail:
          "Az illesztés részszóra megy, ezért a 3 karakternél rövidebb kulcsszó rengeteg " +
          "véletlen találatot ad — az „ár” például a „már” és a „város” szavakra is illeszkedik.",
        href: KOMMENTEK,
      });
    }
    if (!rule.nyilvanosValaszok.filter((t) => t.trim()).length) {
      out.push({
        id: `szabaly-nyilvanos-${rule.id}`,
        level: "ajanlott",
        title: `A(z) „${nev}" szabálynál nem látszik semmi a poszt alatt`,
        detail:
          "Privát üzenet megy, de nyilvános válasz nem. Kívülről úgy tűnik, mintha nem " +
          "történt volna semmi. Adj meg 2-3 változatot.",
        href: KOMMENTEK,
      });
    }
  }

  // --- hangnemi védőkorlátok ---
  if (!c.hatarok.sohaNeMondja.trim()) {
    out.push({
      id: "soha-ne-mondja",
      level: "ajanlott",
      title: "Nincs megadva, mit ne mondjon soha",
      detail: "Itt tilthatod meg például a túlzó ígéreteket vagy a kínos fordulatokat.",
      href: BEALLITASOK,
    });
  }

  // --- értesítés ---
  if (input.pushConfigured && input.pushSubs === 0) {
    out.push({
      id: "nincs-ertesites",
      level: "ajanlott",
      title: "Egyetlen eszköz sem kér értesítést",
      detail:
        "Ha a bot átad egy beszélgetést, senki nem fog szólni róla — a felületre kell ránézned. " +
        "Kapcsold be az értesítést a telefonodon.",
      href: "/admin",
    });
  }

  // --- technikai, csak a tulajdonosnak ---
  if (!input.accountPinned) {
    out.push({
      id: "ig-account-id",
      level: "ajanlott",
      title: "Nincs fiókhoz kötve a feldolgozás",
      detail:
        "IG_ACCOUNT_ID nélkül egy másik, véletlenül bekötött fiók üzenetei is ide folynának be.",
      ownerOnly: true,
    });
  }

  return out;
}

/** Hány valódi hiba van? Ebből lesz a figyelmeztetés súlya. */
export const errorCount = (checks: Check[]) => checks.filter((c) => c.level === "hiba").length;

/** A szerepkörnek megfelelő tételek. */
export const visibleTo = (checks: Check[], owner: boolean) =>
  owner ? checks : checks.filter((c) => !c.ownerOnly);
