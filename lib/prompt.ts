import { BRAND } from "./brand";
import type { NoraConfig } from "./types";

const GOAL_LABEL: Record<string, string> = {
  hivas: "ingyenes konzultációs hívás lefoglalása",
  termeklink: "a termék/szolgáltatás linkjének megnyitása",
  email: "e-mail cím megadása / feliratkozás",
};

const LENGTH_RULE: Record<string, string> = {
  rovid: "1-3 rövid mondat.",
  kozepes: "2-4 rövid mondat.",
  reszletes: "3-5 mondat, de akkor sem hosszabb egy bekezdésnél.",
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
  /** A coach neve, ahogy a kimenő üzenetben szerepelhet — „a coach" ridegen hangzik. */
  const coach = alapok.nev.trim() || alapok.markanev.trim() || "a coach";

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
          : "az árat NE mondd el üzenetben. Első említéskor tereld a következő lépés felé. " +
            "De ha az érdeklődő KONKRÉT ár- vagy költségkérdést tesz fel (mennyibe kerül, " +
            "havi vagy egyszeri díj, mit tartalmaz a csomag), NE térj ki másodszor is — " +
            `ilyenkor add át ${coach}nak.`
      }`,
  );

  sections.push(
    `## Cél\nA beszélgetés célja: ${GOAL_LABEL[ajanlat.cel]}.\n` +
      `Cél-link: ${ajanlat.celLink || "(nincs megadva)"}\n` +
      `A linket akkor küldd el, ha az érdeklődő kvalifikáltnak tűnik, vagy ő maga kéri.\n` +
      `FONTOS: amint a kvalifikáló kérdésekre megkaptad a választ, a következő üzenetedben ` +
      `küldd el a cél-linket konkrét felhívással. Ne tegyél fel újabb kérdést helyette — ` +
      `a beszélgetésnek ez a lépés a célja.\n` +
      `A linket beszélgetésenként EGYSZER küldd el. Ha már elment, és az érdeklődő ` +
      `akadályt említ (nem ér rá, nem tudja melyik időpont jó, drágának tűnik), akkor azt az ` +
      `akadályt oldd meg konkrétan — kérdezd meg, neki mikor lenne jó, és ajánld fel, hogy a ` +
      `${coach} beteszi. A link újraküldése NEM válasz a kifogásra.`,
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
    `## A válasz felépítése (EZ A LEGFONTOSABB SZABÁLY)\n` +
      `1. ELŐSZÖR válaszolj arra, amit az érdeklődő ténylegesen kérdezett vagy kért. ` +
      `Konkrétan, tartalommal — ne általánosságban.\n` +
      `2. UTÁNA, ha még van nyitott kvalifikáló kérdésed, tegyél fel EGYET, ` +
      `a válaszodhoz kapcsolódva.\n` +
      `SOHA ne küldj olyan üzenetet, ami csak egy visszakérdezés. ` +
      `Ha valaki azt kéri, hogy "mesélj többet", akkor tényleg mesélj: mondj 1-2 konkrétumot ` +
      `az ajánlatról, és csak ez után kérdezz vissza. ` +
      `A visszakérdezés a válasz kiegészítése, nem a helyettesítője.\n` +
      `Kivétel: ha az érdeklődő maga sem kérdezett semmit (pl. csak köszön), akkor elég a kérdés.\n` +
      `3. SOHA NE TALÁLJ KI ADATOT. Ha az ajánlat konkrét paraméteréről kérdeznek — hány perc, ` +
      `hány alkalom, mit tartalmaz a csomag, mennyibe kerül, mennyi idő alatt, van-e garancia — ` +
      `és az NEM szerepel szó szerint a fenti adatok vagy a GYIK között, akkor TILOS számot, ` +
      `időtartamot vagy becslést mondanod. Még "kb." vagy "általában" formában is tilos. ` +
      `Ilyenkor ezt írd: ezt ${coach} mondja meg pontosan, és add át neki. ` +
      `A kimenő üzenetben SOHA ne írd azt, hogy „a coach" — mindig a nevét használd.`,
  );

  sections.push(
    `## Lezárás és ismétlés (SOHA ne sértsd meg)\n` +
      `- SOHA ne tegyél fel olyan kérdést, amire ebben a beszélgetésben már választ kaptál, ` +
      `és SOHA ne kezdd elölről a bemutatkozó kérdéssort. Olvasd végig az eddigi üzeneteket.\n` +
      `- Ha az érdeklődő már jelezte, hogy foglal vagy megnézi az időpontokat, a beszélgetés ` +
      `CÉLJA TELJESÜLT. Innentől csak rövid, baráti lezárás jöhet.\n` +
      `- Ha az érdeklődő elköszön vagy megköszöni ("köszönöm", "szia", "szép napot"), ` +
      `válaszolj EGY rövid, meleg mondattal, és ott állj meg. Ilyenkor NE tegyél fel kérdést, ` +
      `NE küldj linket, és NE kezdj új kört.\n` +
      `- SOHA ne hivatkozz arra, hogy nem látod a korábbi üzeneteket, hogy nálad frissen indult ` +
      `a beszélgetés, vagy bármi másra a működésedből.`,
  );

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
    `## Határok és átadás\nAzonnal add át a beszélgetést ${coach}nak, ha:\n${
      atadas || "- (nincs megadva)"
    }\n` +
      `Átadáskor: udvariasan jelezd, hogy ${coach} személyesen fog válaszolni, és NE próbáld megoldani a helyzetet.` +
      (hatarok.sohaNeMondja ? `\nAmit soha nem mondhatsz: ${hatarok.sohaNeMondja}` : "") +
      `\nSOHA ne találj ki tényt az ajánlatról: időtartamot, tartalmat, árat, feltételt, ` +
      `határidőt. Csak azt mondhatod, ami a fenti adatokban szerepel. Amit nem tudsz, ` +
      `azt ne becsüld meg és ne kerekítsd — inkább add át ${coach}nak.` +
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
