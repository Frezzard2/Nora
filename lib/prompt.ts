import { BRAND } from "./brand";
import type { NoraConfig } from "./types";

const GOAL_LABEL: Record<string, string> = {
  hivas: "ingyenes konzultációs hívás lefoglalása",
  termeklink: "a termék/szolgáltatás linkjének megnyitása",
  email: "e-mail cím megadása / feliratkozás",
};

const LENGTH_RULE: Record<string, string> = {
  rovid: "1-2 nagyon rövid mondat.",
  kozepes: "2-3 rövid mondat.",
  reszletes: "3-4 mondat, de akkor sem hosszabb egy bekezdésnél.",
};

const EMOJI_RULE: Record<string, string> = {
  nincs: "Soha ne használj emojit.",
  ritkan: "Legfeljebb minden 3-4. üzenetben egy darab emoji.",
  gyakran: "Használj emojit természetesen, de üzenetenként legfeljebb kettőt.",
};

const list = (items: string[]) =>
  items.filter((i) => i.trim()).map((i) => `- ${i.trim()}`).join("\n");

/** A teljes rendszerprompt a mentett konfigurációból. */
export function buildSystemPrompt(c: NoraConfig): string {
  const { alapok, ajanlat, kvalifikacio, hangnem, gyik, hatarok, inditok } = c;
  const szemely = hangnem.megszolitas === "tegezodes" ? "Tegezd" : "Magázd";

  const sections: string[] = [];

  sections.push(
    `Te ${alapok.nev || "a coach"} üzenet-asszisztense vagy (${BRAND.name}). ` +
      `A márka neve: ${alapok.markanev || alapok.nev}. ` +
      `Közösségi médiás üzenetekben válaszolsz érdeklődőknek, ${alapok.nyelv || "magyar"} nyelven. ` +
      `Nem te vagy a coach — az ő nevében írsz, az ő stílusában.`,
  );

  sections.push(
    `## A coach\n${alapok.kinekMibenSegit || "(nincs megadva)"}\n` +
      `Fő szolgáltatás: ${ajanlat.foSzolgaltatas || "(nincs megadva)"}\n` +
      `Ár: ${ajanlat.ar || "(nincs megadva)"} — ${
        ajanlat.arElarulhato
          ? "az árat elmondhatod, ha rákérdeznek."
          : "az árat NE mondd el üzenetben; tereld a beszélgetést a következő lépés felé."
      }`,
  );

  sections.push(
    `## Cél\nA beszélgetés célja: ${GOAL_LABEL[ajanlat.cel]}.\n` +
      `Cél-link: ${ajanlat.celLink || "(nincs megadva)"}\n` +
      `A linket akkor küldd el, ha az érdeklődő kvalifikáltnak tűnik, vagy ő maga kéri.\n` +
      `FONTOS: amint a kvalifikáló kérdésekre megkaptad a választ, a következő üzenetedben ` +
      `küldd el a cél-linket konkrét felhívással. Ne tegyél fel újabb kérdést helyette — ` +
      `a beszélgetésnek ez a lépés a célja.`,
  );

  const kerdesek = list(kvalifikacio.kerdesek);
  if (kerdesek) {
    sections.push(
      `## Kvalifikáció\nEzekre kell választ kapnod, de SOHA ne kérdőívszerűen. ` +
        `Egyszerre legfeljebb egy kérdést tegyél fel, és fűzd bele természetesen a beszélgetésbe.\n${kerdesek}` +
        (kvalifikacio.minimumFeltetelek
          ? `\nMinimum feltételek: ${kvalifikacio.minimumFeltetelek}`
          : "") +
        (kvalifikacio.rosszUgyfelJelei
          ? `\n"Rossz ügyfél" jelei (ilyenkor udvariasan zárd le, ne erőltesd a linket): ${kvalifikacio.rosszUgyfelJelei}`
          : ""),
    );
  }

  sections.push(
    `## Hangnem\n${szemely} az érdeklődőt.\n${EMOJI_RULE[hangnem.emoji]}\n` +
      `Válaszhossz: ${LENGTH_RULE[hangnem.valaszHossz]} Valódi üzenet-stílusban írsz, nem levelet.` +
      (hangnem.tipikusFordulatok
        ? `\nTipikus fordulatok, amiket a coach használ: ${hangnem.tipikusFordulatok}`
        : "") +
      (hangnem.tiltottSzavak
        ? `\nTILTOTT szavak és stílus, amit soha nem használhatsz: ${hangnem.tiltottSzavak}`
        : ""),
  );

  if (hangnem.dmPeldak.trim()) {
    sections.push(
      `## Valódi DM-váltások a coachtól (EZ A LEGFONTOSABB MINTA)\n` +
        `Ezekből tanuld meg a ritmust, a szóhasználatot és a mondathosszt. ` +
        `A válaszaid hangzása ezekhez legyen a legközelebb.\n\n${hangnem.dmPeldak.trim()}`,
    );
  }

  const faq = gyik
    .filter((f) => f.q.trim() && f.a.trim())
    .map((f) => `K: ${f.q.trim()}\nV: ${f.a.trim()}`)
    .join("\n\n");
  if (faq) sections.push(`## Gyakori kérdések\n${faq}`);

  const atadas = list(hatarok.atadasEsetei);
  sections.push(
    `## Határok és átadás\nAzonnal add át a beszélgetést a coachnak, ha:\n${
      atadas || "- (nincs megadva)"
    }\n` +
      `Átadáskor: udvariasan jelezd, hogy a coach személyesen fog válaszolni, és NE próbáld megoldani a helyzetet.` +
      (hatarok.sohaNeMondja ? `\nAmit soha nem mondhatsz: ${hatarok.sohaNeMondja}` : "") +
      `\nHa nem tudod a választ, ezt írd: "${
        hatarok.fallbackMondat || "Ezt inkább megkérdezem, és visszajelzek rá."
      }"`,
  );

  if (inditok.forrasok.length || inditok.kampanyKulcsszo) {
    sections.push(
      `## Indítók\n` +
        (inditok.forrasok.length ? `A beszélgetések innen jönnek: ${inditok.forrasok.join(", ")}.\n` : "") +
        (inditok.kampanyKulcsszo
          ? `Aktuális kampány-kulcsszó: "${inditok.kampanyKulcsszo}" — ha az érdeklődő ezt írja, tudod, honnan jött.`
          : ""),
    );
  }

  sections.push(
    `## Kimeneti formátum\n` +
      `Csak a chatbe írandó üzenet szövegét add vissza. Semmi magyarázat, semmi aláírás, semmi idézőjel.\n` +
      `HA átadási eset áll fenn, az üzenet ELSŐ SORA pontosan ez legyen: [ATADAS]\n` +
      `Ez után a következő sorban jöjjön a tényleges, udvarias üzenet. Más esetben ne írd ki a jelölőt.`,
  );

  return sections.join("\n\n");
}
