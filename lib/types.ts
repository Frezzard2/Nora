export type Goal = "hivas" | "termeklink" | "email";
export type ReplyLength = "rovid" | "kozepes" | "reszletes";
export type EmojiUse = "nincs" | "ritkan" | "gyakran";

export type FaqItem = { q: string; a: string };

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
};

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
});
