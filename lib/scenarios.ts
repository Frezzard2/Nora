export type Scenario = { id: string; label: string; message: string };

export const SCENARIOS: Scenario[] = [
  {
    id: "erdeklodes",
    label: "Érdeklődés ár nélkül",
    message: "Szia! Láttam a videódat, és nagyon megfogott. Mesélnél kicsit arról, hogy mit csináltok?",
  },
  {
    id: "ar",
    label: "Árkérdés rögtön",
    message: "Szia! Mennyibe kerül ez a program?",
  },
  {
    id: "panasz",
    label: "Panasz",
    message:
      "Őszintén szólva a múltkori kurzusotokkal nem voltam elégedett, és még mindig nem kaptam választ a panaszomra.",
  },
  {
    id: "idopocsekolo",
    label: "Időpocsékoló",
    message:
      "Amúgy csak úgy kérdezem, most nincs pénzem semmire, de lehet jövőre. Adnál pár ingyenes tippet addig is?",
  },
  {
    id: "komoly",
    label: "Komoly vevő",
    message:
      "Szia! Fél éve keresek valakit, aki ebben segít. Ráérek heti 3-4 órát, és januárban tudnék kezdeni. Mi a következő lépés?",
  },
];
