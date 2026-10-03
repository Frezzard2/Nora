import TopBar from "@/components/TopBar";
import { BRAND } from "@/lib/brand";

export const metadata = { title: `${BRAND.name} — Adatvédelmi tájékoztató` };

const SECTIONS = [
  {
    h: "Milyen adatokat kezelünk?",
    p: [
      "Instagram-felhasználónév és az Instagram által adott, fiókhoz kötött azonosító (user ID).",
      "Az Instagram Direct üzenetekben elküldött üzenetek tartalma és időpontja.",
      "Az üzenetekre adott válaszok, valamint a válaszgenerálás technikai adatai (felhasznált tokenszám).",
    ],
  },
  {
    h: "Miért kezeljük ezeket?",
    p: [
      "Azért, hogy az Instagram DM-ben feltett kérdésekre választ tudjunk adni, és a beszélgetést szükség esetén élő ügyintézőnek át tudjuk adni.",
      "Más célra — hirdetési profilozásra, harmadik félnek történő továbbértékesítésre — nem használjuk fel.",
    ],
  },
  {
    h: "A válaszokat AI generálja",
    p: [
      "A beszélgetésekben kapott válaszokat mesterséges intelligencia állítja elő, nem ember írja egyenként.",
      "Érzékeny vagy összetett témánál a beszélgetést élő ügyintéző veszi át; ilyenkor az AI nem válaszol tovább.",
    ],
  },
  {
    h: "Kivel osztjuk meg?",
    p: [
      "Az üzenetek tartalma a válasz előállításához az Anthropic PBC (claude.ai) nyelvi modell szolgáltatásába kerül, amely adatfeldolgozóként jár el.",
      "A beszélgetések tárolása az Upstash (Redis) szolgáltatásában történik.",
      "Az üzenetek továbbítását a Meta Platforms (Instagram) végzi, a saját adatvédelmi szabályai szerint.",
      "Ezen kívül más harmadik félnek nem adjuk át.",
    ],
  },
  {
    h: "Meddig tároljuk?",
    p: [
      "A beszélgetéseket legfeljebb 12 hónapig tároljuk, utána töröljük őket.",
      "Egy beszélgetésből a legutóbbi 60 üzenet marad meg, a régebbiek automatikusan kiesnek.",
    ],
  },
  {
    h: "Hogyan kérhető törlés?",
    p: [
      "Írj egy üzenetet ugyanabban az Instagram beszélgetésben a „törlés” szóval, vagy e-mailben az alább megadott címre.",
      "A kérést 30 napon belül teljesítjük, és a beszélgetés teljes előzményét töröljük a tárolóból.",
      "Ugyanígy kérhető tájékoztatás arról is, milyen adatot tárolunk rólad.",
    ],
  },
  {
    h: "Kapcsolat",
    p: [
      "Adatkezelő: (ide írd a cég/egyéni vállalkozó nevét és székhelyét).",
      "E-mail: (ide írd a kapcsolattartási e-mail címet).",
    ],
  },
];

export default function Privacy() {
  return (
    <>
      <TopBar tag="Adatvédelem" />

      <main className="mx-auto max-w-[720px] px-4 py-12 sm:px-8 sm:py-16">
        <h1 className="text-[32px] font-bold leading-tight sm:text-[42px]">
          Adatvédelmi tájékoztató
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Ez a tájékoztató arról szól, hogyan kezeljük az Instagram Direct üzeneteken keresztül
          hozzánk érkező adatokat.
        </p>

        <div className="mt-10 flex flex-col gap-8">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl font-bold">{s.h}</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {s.p.map((line) => (
                  <li key={line} className="text-[16px] leading-relaxed text-muted">
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
