export type Goal = "hivas" | "termeklink" | "email";
export type ReplyLength = "rovid" | "kozepes" | "reszletes";
export type EmojiUse = "nincs" | "ritkan" | "gyakran";

export type FaqItem = { q: string; a: string };

/** „Minden poszt" — a szabály nincs konkrét bejegyzéshez kötve. */
export const MINDEN_POSZT = "minden";

/**
 * Egy komment-szabály: mire reagálunk, melyik poszt alatt, és mit küldünk.
 * A privát válasz DM-ben megy, a nyilvános a komment alá.
 */
export type CommentRule = {
  /** stabil azonosító — a statisztika és a szerkesztés ehhez kötődik */
  id: string;
  /** emberi név, csak az admin felületen látszik */
  nev: string;
  be: boolean;
  /** egyezés kis/nagybetű és ékezet nélkül, részszóra is */
  kulcsszavak: string[];
  /** poszt (média) azonosító, vagy MINDEN_POSZT */
  poszt: string;
  /** a privát DM szövege; ha üres, az AI generálja a konfigurációból */
  privatSzoveg: string;
  /** nyilvános válaszok a komment alá; véletlenül választunk közülük */
  nyilvanosValaszok: string[];
};

let ruleSeq = 0;

export const emptyRule = (): CommentRule => ({
  // Date.now() egy böngészőben több szabály létrehozásakor ütközhet, ezért a sorszám is kell
  id: `szabaly-${Date.now().toString(36)}-${(ruleSeq++).toString(36)}`,
  nev: "",
  be: true,
  kulcsszavak: [],
  poszt: MINDEN_POSZT,
  privatSzoveg: "",
  nyilvanosValaszok: [],
});

export type NoraConfig = {
  alapok: {
    nev: string;
    markanev: string;
    kinekMibenSegit: string;
    nyelv: string;
  };
  ajanlat: {
    foSzolgaltatas: string;
    ar: string;
    arElarulhato: boolean;
    cel: Goal;
    celLink: string;
  };
  kvalifikacio: {
    kerdesek: string[];
    rosszUgyfelJelei: string;
    minimumFeltetelek: string;
  };
  hangnem: {
    megszolitas: "tegezodes" | "magazodas";
    emoji: EmojiUse;
    valaszHossz: ReplyLength;
    dmPeldak: string;
    tipikusFordulatok: string;
    tiltottSzavak: string;
  };
  gyik: FaqItem[];
  hatarok: {
    atadasEsetei: string[];
    sohaNeMondja: string;
    fallbackMondat: string;
  };
  inditok: {
    forrasok: string[];
    kampanyKulcsszo: string;
  };
  commentRules: CommentRule[];
  utankovetes: Utankovetes;
};

/**
 * Utánkövetés: egy udvarias emlékeztető, ha az érdeklődő elhallgat azután,
 * hogy a bot válaszolt neki. Alapból KI van kapcsolva — kéretlen üzenetet
 * küldeni más nevében csak szándékosan szabad.
 */
export type Utankovetes = {
  be: boolean;
  /** hány óra csend után; a Meta 24 órás ablaka miatt ennél tovább nem várhatunk */
  orak: number;
  /** hány emlékeztető mehet ki egy beszélgetésben összesen */
  maxDb: number;
  /** az emlékeztető szövege — üresen nem megy ki semmi */
  szoveg: string;
};

/** A Meta 24 órás üzenetküldési ablaka. Ennél tovább nem írhatunk automatán. */
export const UTANKOVETES_MAX_ORA = 20;

export const ATADAS_ALAP = [
  "Panasz",
  "Ár-alku",
  "Érzékeny egészségügyi vagy személyes téma",
  "Dühös üzenet",
];

export const emptyConfig = (): NoraConfig => ({
  alapok: { nev: "", markanev: "", kinekMibenSegit: "", nyelv: "magyar" },
  ajanlat: { foSzolgaltatas: "", ar: "", arElarulhato: true, cel: "hivas", celLink: "" },
  kvalifikacio: { kerdesek: ["", ""], rosszUgyfelJelei: "", minimumFeltetelek: "" },
  hangnem: {
    megszolitas: "tegezodes",
    emoji: "ritkan",
    valaszHossz: "rovid",
    dmPeldak: "",
    tipikusFordulatok: "",
    tiltottSzavak: "",
  },
  gyik: [{ q: "", a: "" }],
  hatarok: { atadasEsetei: [...ATADAS_ALAP], sohaNeMondja: "", fallbackMondat: "" },
  inditok: { forrasok: [], kampanyKulcsszo: "" },
  commentRules: [],
  utankovetes: { be: false, orak: 6, maxDb: 1, szoveg: "" },
});

/** Importált JSON-t összefésüli az üres alapértelmezéssel, hogy hiányzó mező ne dobjon hibát. */
export function mergeConfig(input: unknown): NoraConfig {
  const base = emptyConfig();
  if (typeof input !== "object" || input === null) return base;
  const src = input as Record<string, unknown>;

  for (const key of Object.keys(base) as (keyof NoraConfig)[]) {
    const value = src[key];
    if (Array.isArray(base[key])) {
      if (Array.isArray(value)) base[key] = value as never;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      base[key] = { ...base[key], ...value } as never;
    }
  }
  return base;
}
