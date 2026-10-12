# Nora

AI üzenet-asszisztens coachoknak és kreátoroknak. Next.js (App Router) + Tailwind + TypeScript.
Egy ügyfél (single tenant), egy Instagram professional fiók.

## Helyi indítás

```bash
cp .env.example .env.local     # és töltsd ki a kulcsokat
npm install
npm run dev
npm run check                  # a logikai önellenőrzések
```

A konfigurációt az `/onboarding` varázslóval állítod össze, és a végén az **Élesítés**
gombbal mented. Onnantól a bot azzal válaszol — nincs commit, nincs env változó,
nincs redeploy. Újra megnyitva a varázsló az élesben futó konfigurációt tölti be,
szóval szerkeszteni is ott tudod.

Három forrás van, ebben a sorrendben:

| Forrás | Mikor |
|---|---|
| **felület** (Élesítés gomb → Redis) | ha használták — ez nyer |
| **`NORA_CONFIG`** env változó (a JSON egy sorban) | ha a felületet nem használják |
| **`config/client.json`** | helyi fejlesztéshez |

Az `/admin` fejléce mindig kiírja, melyikből fut éppen.

> **Amíg a konfiguráció nincs kitöltve, a bot nem válaszol** — az üzeneteket eltárolja, és az
> `/admin` oldal felül megmutatja, melyik mező hiányzik. Ez szándékos: éles fiókon
> rosszabb egy általánosságokat író bot, mint a csend. Kötelező mezők:
> `alapok.nev` (vagy `markanev`), `alapok.kinekMibenSegit`, `ajanlat.foSzolgaltatas`,
> `ajanlat.celLink`.

| Útvonal | Mi ez |
|---|---|
| `/belepes` | Belépés jelszóval (tulajdonos vagy ügyfél) |
| `/admin` | Áttekintő, beszélgetések, beállítások, komment-szabályok |
| `/onboarding` | Beállító varázsló + **Élesítés** — csak tulajdonosnak |
| `/simulator` | Teszt-chat, nem küld valódi üzenetet — csak tulajdonosnak |
| `/adatvedelem` | Adatvédelmi tájékoztató (a Meta app publikálásához kell) |
| `/api/webhook` | A Meta ide küldi az Instagram eseményeket |

## Beállítás sorrendje

### 1. Upstash Redis

[console.upstash.com](https://console.upstash.com) → **Create database** → a *REST API*
fülről másold ki az `UPSTASH_REDIS_REST_URL` és `UPSTASH_REDIS_REST_TOKEN` értéket.

### 2. Vercel deploy

```bash
npx vercel          # első deploy
npx vercel --prod
```

A **Project → Settings → Environment Variables** alatt vidd fel a `.env.example`
összes változóját. Az `IG_VERIFY_TOKEN` egy általad kitalált jelszó — jegyezd fel,
a 4. lépésben ugyanazt kell beírni. A deploy után megvan az URL, pl.
`https://nora.vercel.app`. A webhook végpont ennek az `/api/webhook` útvonala.

> Változó módosítása után újra kell deployolni, különben a régi érték fut.

### 3. Meta app létrehozása

[developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create app** →
use case: **Other** → típus: **Business**.

A bal oldali menüben **Instagram → API setup with Instagram login**:

1. *Generate access token* → válaszd ki az Instagram professional fiókot →
   a kapott token megy az `IG_ACCESS_TOKEN`-be.
2. **App settings → Basic → App secret** → *Show* → ez megy az `IG_APP_SECRET`-be.

Az Instagram fióknak **professional** (Business vagy Creator) típusúnak kell lennie, és
a fiók beállításaiban engedni kell, hogy külső eszközök hozzáférjenek a üzenetekhez:
*Instagram app → Beállítások → Üzenetek és válaszok → Csatlakoztatott eszközök*.

### 4. Webhook konfigurálása a Meta dashboardon

**Instagram → API setup with Instagram login → 2. Configure webhooks** (vagy
**Webhooks** menü):

| Mező | Érték |
|---|---|
| Callback URL | `https://<a-te-domained>/api/webhook` |
| Verify token | pontosan az, amit az `IG_VERIFY_TOKEN`-be írtál |

**Verify and save** → a Meta GET kéréssel ellenőriz, a végpont visszaadja a challenge-et.
Ha 403-at kapsz: a token nem egyezik, vagy a deploy még a régi env-vel fut.

Utána fel kell iratkozni (*Subscribe*) két mezőre:

- **messages** — a DM-ekhez
- **comments** — a komment-figyeléshez (ha nem használod, ezt kihagyhatod)

A `messaging_postbacks` nem szükséges, a bot csak szöveget kezel.

### 5. Konfiguráció feltöltése

Nyisd meg a deployolt `/onboarding`-ot, menj végig a varázslón, **Exportálás**.
A letöltött JSON-t egy sorba tömörítve add meg `NORA_CONFIG` env változóként:

```bash
jq -c . ~/Downloads/nora-config.json | pbcopy    # és beillesztés a Vercelen
```

Kiindulásnak ott van a **`config/client.example.json`** — egy végigírt példa (DJ
fellépés-foglalás) GYIK-kal, valódi DM-mintákkal és átadási esetekkel. Két mezőben
`PLACEHOLDER` szöveg áll (`ajanlat.ar`, `ajanlat.celLink`): amíg ezeket nem írod át,
a bot szándékosan nem válaszol, hogy a példaszöveg ne menjen ki érdeklődőnek.

Majd **Redeploy**. (Helyi fejlesztéshez egyszerűbb a `config/client.json`-ba másolni —
ha a `NORA_CONFIG` nincs beállítva, abból olvasunk.)

Az `/admin` tetején lévő piros sáv addig látszik, amíg env változó vagy
konfigurációs mező hiányzik — ha eltűnt, minden a helyén van.

### 6. Teszt

Írj egy DM-et a fiókra **egy másik Instagram fiókról** (a sajátodnak küldött üzenet
echo-ként jön vissza, azt a webhook kiszűri). Pár másodperc után jön a válasz, és a
beszélgetés megjelenik az `/admin` felületen.

### 7. Publikálás (élő fiókhoz, fejlesztői módon túl)

Development módban csak az app szerepkörrel rendelkező fiókjai tudnak írni. Élesítéshez
az App Review-hoz kell: `instagram_business_basic`, `instagram_business_manage_messages`,
komment-figyeléshez `instagram_business_manage_comments`, az adatvédelmi oldal URL-je
(`/adatvedelem`), és egy képernyőfelvétel a működésről.

## Új ügyfél beállítása lépésről lépésre

Egy ügyfél = egy Vercel projekt. Nincs regisztráció, előfizetés és több-ügyfeles
kezelés — ha jön a második ügyfél, ez a lista megy újra.

**1. Vercel projekt.** Importáld ugyanezt a repót új projektként. A repóhoz nem
kell hozzányúlni: minden ügyfélspecifikus érték env változó.

**2. Az ügyfél fiókja az apphoz.** A Meta App Dashboardon
**App roles → Roles → Add people → Instagram Tester**, add meg az ügyfél Instagram
felhasználónevét. Az ügyfélnek el kell fogadnia a meghívót:
**Instagram app → Beállítások → Weboldal-engedélyek → Alkalmazások és weboldalak →
Tesztelői meghívók**. Amíg ez nincs elfogadva, a token generálása elhasal.
(Publikált app esetén ez a lépés kimarad.)

**3. Token.** **Instagram → API setup with Instagram login →
Generate access token**, az ügyfél fiókjával belépve. A kapott hosszú életű
(60 napos) token megy az `IG_ACCESS_TOKEN` env változóba. **Naptárba a lejáratot** —
megújítás nélkül a bot némán elhallgat.

**4. Env változók a Vercelen.** `.env.example` a teljes lista. Ami ügyfelenként
változik: `IG_ACCESS_TOKEN`, `IG_ACCOUNT_ID`, `ADMIN_PASSWORD`, `CLIENT_PASSWORD`,
és a saját Upstash adatbázis. Ami az apphoz tartozik (`IG_APP_SECRET`,
`IG_VERIFY_TOKEN`), az nem változik — lásd a *Másik fiókra átállítás* szakaszt.

**5. Webhook.** Egy app = egy callback URL. Ha az ügyfél külön Meta appot kap,
állítsd be neki a webhookot a 4. pont szerint, és iratkozz fel a `messages` és
`comments` mezőkre.

**6. Konfiguráció kitöltése.** Nyisd meg a `/belepes`-t a tulajdonosi jelszóval,
majd az **/admin/beallitasok** oldalt, és töltsd ki az ügyféllel együtt a
szekciókat. Mentés után azonnal él, redeploy nélkül. (A `/onboarding` varázsló
ugyanezeket a mezőket kérdezi lépésenként — ha az ügyfél egyedül tölti ki,
az kényelmesebb.)

**7. Komment-szabályok.** Az **/admin/kommentek** oldalon vedd fel, mire reagáljon
a bot a posztok alatt. Szabály nélkül a kommentekre nem történik semmi.

**8. Átadás az ügyfélnek.** Add meg neki a deploy URL-jét és a `CLIENT_PASSWORD`-öt.
A kezdőlapon a **Belépés** gombbal (vagy a `/belepes`-en) lép be, és a saját
beszélgetéseit, kapcsolóit, statisztikáját és beállításait látja — AI-költséget és
technikai hibát nem. A tulajdonosi oldalakra (`/onboarding`, `/simulator`) nem jut
be: ha odatéved, az `/admin`-ra irányítjuk.

## Admin felület

**Hogyan jutsz el oda:** a nyilvános kezdőlapon (`/`) a **Belépés** gomb, vagy
közvetlenül a `/belepes`. Belépés után mindenki arra az oldalra kerül, ami jár
neki — az `/onboarding` és a `/simulator` fejlécében is ott a **Felület** link,
és a varázsló utolsó képernyőjén is.

Két szerepkör, két jelszó (`ADMIN_PASSWORD`, `CLIENT_PASSWORD`). A belépés a
`/belepes` oldalon, a munkamenet sütiben él 30 napig, kijelentkezés a fejlécben.

| Oldal | Mi van rajta |
|---|---|
| `/admin` | Mai és heti beszélgetésszám, bot által kezelt / emberhez került, átlagos válaszidő, nagy állapotjelző, legutóbbi 5 beszélgetés. Tulajdonosnak: AI-költség ma / hónap / beszélgetésenként, és a hiányzó beállítások sávja. |
| `/admin/beszelgetesek` | Lista állapot-szűréssel és felhasználónév-kereséssel. Soronként bot ki/be és „Átadom embernek". |
| `/admin/beszelgetesek/<id>` | A teljes üzenetváltás chat-nézetben, saját és bejövő üzenet elkülönítve. Itt van a „Figyelmen kívül hagyom" kapcsoló is. |
| `/admin/beallitasok` | A konfiguráció űrlapon, a kérdőív szekciói szerint. Mentés előtt jelzi a hiányzó kötelező mezőket, mentés után azonnal él. |
| `/admin/kommentek` | Komment-szabályok szerkesztése, be/ki kapcsolása, és hogy melyik hányszor sült el az elmúlt 7 napban. |

Csak a tulajdonosé: az AI-költség, a technikai hibaüzenetek, a globális
vészkapcsoló, valamint az `/onboarding` és a `/simulator`.

### Felhasználónevek

A webhook csak opak azonosítót ad a DM küldőjéről, ezért beszélgetésenként
egyszer lekérjük a felhasználónevet
(`GET /<IGSID>?fields=username`, [User Profile API][up]). Ha nem sikerül, a lista
az azonosítót mutatja, és nem próbáljuk újra minden üzenetnél. Kommentnél a
felhasználónév a webhookban jön, külön kérés nélkül.

[up]: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/user-profile

### A saját fiókod kizárása

Ha a **saját személyes Instagram fiókodról** írsz a bot fiókjának, az valódi
DM-ként érkezik — a visszhang-szűrés nem fogja meg, és a bot válaszolna neked.
Nyisd meg a beszélgetést, és nyomd meg a **„Figyelmen kívül hagyom"** gombot:
onnantól sem a DM-jeire, sem a kommentjeire nem reagálunk, és az új üzeneteit
nem is tároljuk. Bármikor visszavonható ugyanott.

## Komment-figyelés

Ha valaki a poszt alá olyan kommentet ír, ami illeszkedik egy bekapcsolt
szabályra, a bot privát üzenetet küld neki DM-ben, és — ha van megadva — nyilvános
választ is ír a komment alá. **Illeszkedő szabály nélkül nem történik semmi**: a
bot alapértelmezésben nem válaszol minden kommentre.

A komment-indította beszélgetés ugyanabba az állapotba kerül, mint egy sima DM
(ugyanaz a kulcs: a kommentelő azonosítója), csak „kommentből indult" jelzéssel és
a poszt azonosítójával. Ha az illető utána ír, a bot folytatja, és az embernek
átadás is ugyanúgy működik.

Meta-korlátok, amiket a kód betart:

- Egy kommentre **összesen egy** privát üzenet küldhető. Amire egyszer ment,
  arra soha többet — ezt lejárat nélkül tároljuk.
- A privát válaszra 7 nap az ablak a komment megjelenése után.
- A privát válasz egy üzenet, tehát nem darabolható: 1000 karakternél vágunk.

Végpontok (a Meta dokumentációja szerint, `lib/comments.ts`):
`POST /me/messages` a `recipient.comment_id` mezővel (privát válasz), és
`POST /<komment-id>/replies` (nyilvános válasz).

### Mit kell beállítani a Meta dashboardon

**1. Jogosultság.** *App review → Permissions and features*, vagy
*Instagram → API setup with Instagram login*:

| Mire kell | Jogosultság |
|---|---|
| DM olvasás/küldés (ez már megvan) | `instagram_business_basic`, `instagram_business_manage_messages` |
| **Komment olvasás, nyilvános válasz, privát válasz** | **`instagram_business_manage_comments`** |

> **A jogosultság önmagában nem elég: a tokenbe be van égetve a hatókör.** Miután
> hozzáadtad a `instagram_business_manage_comments`-et, **generálj új
> `IG_ACCESS_TOKEN`-t**, és cseréld ki a Vercelen. A régi tokennel a komment-végpontok
> `code 200` / „permission" hibát adnak, a napló ezt kiírja.

**2. Webhook mező.** *Webhooks* (vagy *API setup with Instagram login →
Configure webhooks*) → a `comments` mező mellett **Subscribe**. A callback URL
és a verify token ugyanaz, mint a `messages`-nél — egy app = egy webhook URL.
Élő adáshoz külön van `live_comments`, azt a kód jelenleg nem kezeli.

### Hogyan teszteld

**a) Helyben, Meta nélkül.** A *Helyi tesztelés* szakasz komment-példájával. Ez a
leggyorsabb kör: nem kell poszt, nem kell második fiók, és semmi nem megy ki
Instagramra (a küldés elhasal, a napló megírja, miért).

**b) A dashboard „Send to My Server" gombjával.** *Webhooks → comments → Test*.
Minta-eseményt küld a végpontodra. A szövege nem a te kulcsszavad, ezért
alapból egy szabály sem fog illeszkedni — ha látni akarod a teljes kört, vedd fel
ideiglenesen a minta szövegéből egy szót kulcsszóként az `/admin/kommentek`
oldalon. **A minta-esemény azonosítói nem valódiak**, ezért a válaszküldés
elhasal a Metánál; a szabály-illesztés és a naplózás viszont lefut.

**c) Élesben, valódi kommenttel.** Ehhez kell:

1. bekapcsolt globális vészkapcsoló az `/admin` oldalon,
2. legalább egy bekapcsolt komment-szabály illeszkedő kulcsszóval,
3. **egy másik Instagram fiók** — a saját fiókod kommentjét szándékosan kiszűrjük,
   különben a bot magára reagálna,
4. ha az app még Development módban van, ennek a másik fióknak is **Instagram
   Testernek** kell lennie az appban (és el kell fogadnia a meghívót).

Írj a másik fiókkal kommentet a posztod alá a kulcsszóval. Pár másodperc múlva
megjön a privát üzenet, a nyilvános válasz kikerül a komment alá, és a
beszélgetés megjelenik az `/admin/beszelgetesek` listában „Kommentből" jelzéssel.
A szabály találat-számlálója az `/admin/kommentek` oldalon lép.

> Ha nem történik semmi: az `/admin` tetején (tulajdonosként) megjelenik a
> **Feldolgozhatatlan webhook-esemény** doboz, ha olyan esemény jött, amiből
> hiányoztak a várt mezők — a szerkezete ott látszik, tartalom nélkül. Ha ez sem
> jelenik meg, akkor az esemény el sem jutott hozzánk: ellenőrizd a `comments`
> feliratkozást és a callback URL-t.

## Helyi tesztelés igazi Meta app nélkül

A webhook aláírást kér, de a kérést te is alá tudod írni:

```bash
BODY='{"entry":[{"messaging":[{"sender":{"id":"teszt-user"},
  "message":{"mid":"m1","text":"Szia! Mennyibe kerül?"}}]}]}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$IG_APP_SECRET" -hex | awk '{print $2}')

curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  -d "$BODY"
```

A válasz azonnal `EVENT_RECEIVED`; a feldolgozás utána fut, a napló a `npm run dev`
konzolján látszik. Küldés csak akkor történik, ha az `IG_ACCESS_TOKEN` valódi — enélkül
a log jelzi, hogy nem ment ki üzenet, de a beszélgetés tárolódik, és az `/admin`-on látszik.

Komment-esemény ugyanígy, csak a `comments` mezővel. A `from.id` ne egyezzen az
`entry.id`-vel, különben saját kommentnek vesszük és kiszűrjük:

```bash
BODY='{"entry":[{"id":"sajat-fiok","changes":[{"field":"comments","value":{
  "from":{"id":"teszt-user","username":"teszt"},"comment_id":"k1",
  "text":"Mennyi az ára?","media":{"id":"poszt-1"}}}]}]}'
```

Ehhez kell legalább egy bekapcsolt komment-szabály illeszkedő kulcsszóval, különben
a log azt írja, hogy egy szabály sem illeszkedik.

A komment azonosítója `comment_id` és `id` néven is érkezhet — a kód mindkettőt
elfogadja. Ha olyan alak jön, amiből hiányzik a várt mező, a napló és az `/admin`
is megmutatja a szerkezetét (kulcsok és típusok, tartalom nélkül).

A verify hívás kézzel:

```bash
curl "http://localhost:3000/api/webhook?hub.mode=subscribe&hub.verify_token=$IG_VERIFY_TOKEN&hub.challenge=123"
```

## Felépítés

| Fájl | Szerep |
|---|---|
| `config/client.json` | **Az ügyfél konfigurációja.** A kérdőív exportált JSON-ja. |
| `lib/brand.ts` | A márkanév egyetlen helye |
| `lib/types.ts` | A konfiguráció JSON sémája |
| `lib/prompt.ts` | Rendszerprompt építése a konfigból |
| `lib/reply-engine.ts` | Válaszgenerálás (Anthropic) + token/költség becslés |
| `lib/handleMessage.ts` | Mit tegyünk egy bejövő DM-mel (tárolás, korlátok, átadás) |
| `lib/handleComment.ts` | Mit tegyünk egy bejövő kommenttel (szabály, privát + nyilvános válasz) |
| `lib/comment-rules.ts` | A komment-szabályok illesztése (tiszta függvények, önellenőrzött) |
| `lib/comments.ts` | Privát és nyilvános válasz a Graph API-ra |
| `lib/stats.ts` | Az áttekintő számai a beszélgetésekből (nincs külön statisztika-tároló) |
| `lib/auth.ts` | A bejelentkezett szerep szerveroldali olvasása |
| `lib/session.ts` | Munkamenet-süti és a két szerepkör |
| `lib/instagram.ts` | Kimenő üzenet a Graph API-ra, darabolással és óránkénti korláttal |
| `lib/store.ts` | **Minden tárolás ezen megy át** (Upstash Redis) — cserélhető |
| `lib/keys.ts` | **Minden Redis-kulcs itt képződik** — névtér (`REDIS_PREFIX`) |
| `lib/limits.ts` | Napi AI-költségplafon (tiszta függvények, önellenőrzött) |
| `scripts/migrate-prefix.ts` | Egyszeri migráció: meglévő kulcsok átnevezése névtérbe |
| `lib/signature.ts` | Az `X-Hub-Signature-256` ellenőrzése |
| `lib/chunk.ts` | 1000 karakteres darabolás |
| `lib/handover.ts` | Az „átadás embernek” jelölő feldolgozása |
| `middleware.ts` | Munkamenet-ellenőrzés az `/admin` és a fizetős végpontok előtt |
| `app/api/webhook/route.ts` | A Meta webhook (GET verify, POST események) |

## Több ügyfél egy Upstash adatbázison

Az ingyenes Upstash csomagban egy adatbázis van, ezért több deploy osztozik
rajta. Az elválasztás kulcs-előtaggal történik: a `REDIS_PREFIX` env változó
adja a névteret, és **minden** kulcs `<előtag>:...` alakú. A kulcsképzés
egyetlen helyen van (`lib/keys.ts`) — ha új kulcs kell, oda vedd fel, különben
kilóg a névtérből.

> **Ez logikai elválasztás, nem fizikai.** Ugyanaz az Upstash token minden
> névtérhez hozzáfér: aki a tokent megszerzi, az összes ügyfél adatát látja, és
> egy elgépelt előtag két ügyfelet összeránt. Teszthez és saját deployhoz ez
> rendben van. **Fizető ügyfélnél adj külön Upstash adatbázist** — külön URL és
> token, és akkor az előtag már csak kényelmi réteg.

Üresen hagyva az előtag `default`.

### Migráció meglévő adaton

A `REDIS_PREFIX` bevezetése előtt minden kulcs `nora:` előtaggal készült. Az új
kód a saját névterében keres, tehát a régi kulcsokat át kell nevezni — **a
konfigurációt (`nora:config`) is beleértve**, különben a bot úgy indul, mintha
üres lenne az adatbázis, és nem válaszol.

```bash
npm run migrate-prefix -- --to <előtag>          # forrás alapértelmezésben: nora
npm run migrate-prefix -- --from nora --to bence
```

A script felsorolja, mit fog átnevezni, és **rákérdez**, mielőtt bármihez
hozzányúlna. Nem töröl, és létező célkulcsot nem ír felül (RENAMENX) — ami
ütközne, azt kihagyja és kiírja. A `--yes` kapcsolóval kérdés nélkül fut.

A sorrend számít: **előbb a migráció, aztán a `REDIS_PREFIX` beállítása és a
redeploy.** Fordítva a bot addig üres adatbázist lát.

## Biztonsági korlátok

- Minden POST aláírás-ellenőrzésen megy át (HMAC SHA-256, időzítésbiztos összehasonlítás).
- Beszélgetésenkénti napi válaszkorlát: `MAX_REPLIES_PER_DAY` (alap: 20) — az
  AI-hívás előtt ellenőrizve.
- Globális óránkénti küldési korlát: `IG_MAX_SENDS_PER_HOUR` (alap: 180).
- **Globális napi AI-költségplafon: `DAILY_COST_LIMIT_USD` (alap: 2).** A másik
  két korlát egy beszélgetést, illetve a kiküldést fogja vissza; egyik sem véd
  az ellen, ha sok beszélgetés fut egyszerre. A plafon az AI-hívás ELŐTT
  ellenőrzi a nap eddigi becsült költségét, és betelés esetén a bot nem generál
  több választ — az üzenetek megérkeznek és tárolódnak. Az `/admin` oldalon
  figyelmeztetés jelenik meg (a tulajdonos látja az összeget is), és a számláló
  UTC éjfélkor nullázódik.
- A komment privát válaszának „egy kommentre egyszer" kapuja szintén az
  AI-hívás előtt van, hogy a második kézbesítés ne kerüljön pénzbe.
- Globális vészkapcsoló az `/admin` felületen — azonnal elhallgattatja a botot.
- Duplikált kézbesítés szűrése `message.mid`, illetve komment-ID alapján, 24 órás lejárattal.
- Egy kommentre csak egyszer megy privát válasz (lejárat nélküli nyom a tárolóban).
- A saját fiók kommentjeit és a saját nyilvános válaszainkat kiszűrjük — enélkül a
  bot magára reagálna.
- Titkok csak szerveroldalon: nincs `NEXT_PUBLIC_` kulcs, a `.env.local` nincs a repóban.
- Jelszó mögött: `/admin`, `/onboarding`, `/simulator`, `/api/config`, `/api/reply`.
  Az utolsó kettő azért, mert fizetett AI-hívást indítanak — nyilvános deployon
  enélkül bárki égethetné a kvótát.
- Az `/onboarding` és a `/simulator` csak a tulajdonosnak nyílik meg, az ügyfélnek nem.
- A munkamenet-sütiben nem a jelszó van, hanem a jelszóból származtatott jegy;
  a jelszó cseréje minden korábbi munkamenetet érvénytelenít.
- Nyilvános: a főoldal, az `/adatvedelem` (a Meta app publikálásához kell), a
  `/belepes` és az `/api/webhook` (a Meta hívja, saját aláírás-ellenőrzéssel).
- Az admin kapcsolók csak már létező beszélgetést módosítanak (hamisított POST nem
  tud szemét rekordot írni a tárolóba).
- Kitöltetlen konfigurációval a bot nem válaszol.
- Figyelmen kívül hagyott fiók üzenetét nem tároljuk és nem válaszoljuk meg
  (a saját személyes fiókodhoz).

## Melyik fiókról érkeznek az események?

Egy Meta apphoz több Instagram fiók is köthető, és **a webhook-feliratkozás
fiókonként áll vagy bukik** — a mezők (`messages`, `comments`) app-szintűek, de
hogy egy adott fiók küld-e egyáltalán eseményt, az a fiók saját feliratkozásán
múlik (`POST /me/subscribed_apps` az **adott fiók** tokenjével).

Ebből következik a leggyakoribb üzembe helyezési hiba: ha egy másik fiók (pl. a
saját személyes profilod) is fel van iratkozva, **annak a magánüzenetei is ide
folynak be** — tárolódnak, és az AI-válasz is legenerálódik rájuk, csak kiküldeni
nem tudjuk, mert a token egy másik fiókhoz tartozik.

Ezért az `/admin` tetején (tulajdonosként) figyelmeztetés jelenik meg, ha nincs
beállítva `IG_ACCOUNT_ID`, és megmutatja, mely fiókokra érkezett eddig esemény,
valamint hogy a token melyik fiókhoz tartozik. Ha a kettő nem egyezik, baj van.

**A saját fiókod azonosítójának kiderítése:**

1. A Meta dashboardon kapcsold ki a webhook-feliratkozást a nem kívánt fióknál
   (vagy vond vissza az app hozzáférését abban az Instagram fiókban:
   *Beállítások → Weboldal-engedélyek → Alkalmazások és weboldalak*).
2. Az `/admin` figyelmeztetésében nyomd meg a **Lista nullázása** gombot — a
   megfigyelt azonosítók listája halmozódik, enélkül a régi érték ott maradna.
3. Írass egy DM-et a fiókodnak egy másik Instagram fiókról.
4. Ami ezután megjelenik a listában, az az élesben bekötött fiók. Ezt az
   azonosítót tedd az `IG_ACCOUNT_ID` env változóba.

Az `IG_ACCOUNT_ID` ezután kódszinten is kiszűri az idegen fiók eseményeit, akkor
is, ha a dashboardon később véletlenül visszakapcsolódik a feliratkozás.

> Rossz értékkel **minden** esemény kiesik, ezért a 3-4. lépést ne hagyd ki.

## Másik fiókra átállítás

Nem kell új Meta app minden fiókhoz — egy app több Instagram fiókot is kezel.
Ami mihez tartozik:

| Érték | Mihez kötött |
|---|---|
| `IG_APP_SECRET` | az **apphoz** — fiókonként nem változik |
| `IG_VERIFY_TOKEN` | az apphoz (te találod ki) |
| `IG_ACCESS_TOKEN` | a **fiókhoz** — csak ez fiókspecifikus |
| Callback URL | az apphoz: **egy app = egy webhook URL** |

Fiókváltáshoz tehát elég: új `IG_ACCESS_TOKEN`, és a konfigurációt az új deploy
`/onboarding`-ján élesíteni.

**Új ügyfél = új Vercel projekt, kód nélkül.** Ugyanezt a repót importálod még egyszer,
és csak az env változókat állítod be:

| Változó | Ügyfélspecifikus? |
|---|---|
| `NORA_CONFIG` | nem kell, ha a felületen élesítenek — csak tartalék |
| `IG_ACCESS_TOKEN` | igen — az ő Instagram fiókjához generált token |
| `IG_VERIFY_TOKEN`, `ADMIN_PASSWORD` | igen (külön jelszó ügyfelenként) |
| `IG_APP_SECRET` | csak ha külön Meta appot használ |
| `UPSTASH_*` | lehet közös is, de külön adatbázis tisztább |
| `ANTHROPIC_API_KEY` | közös |

A webhook URL az adott deploy `/api/webhook` címe lesz, és az adott app
dashboardján kell beállítani.

> **Egy apphoz csak egy Instagram fiókot kapcsolj be.** Ez single tenant MVP:
> egy `IG_ACCESS_TOKEN`, egy konfiguráció. Két bekapcsolt fiók esetén mindkettő
> üzenete ide jön, de válaszolni csak a tokenhez tartozó fiókban tudunk — a
> másiknál az AI-hívás kifizetődik, a válasz viszont elhasal.
> Két fiók élesben = két app (mert egy app egy callback URL-t tud) + két deploy.
>
> Védelemként állítsd be az **`IG_ACCOUNT_ID`** env változót a saját fiók
> webhook-azonosítójára: a többi fiók eseményeit a webhook eldobja, AI-hívás
> nélkül. Az értéket az `/admin` figyelmeztető sávja mutatja meg, ha több fiók
> érkezik. Ha rosszul állítod be, a bot egyáltalán nem válaszol (biztonságos
> irányba hibázik), és a napló kiírja a tényleges azonosítót.

Az `IG_ACCESS_TOKEN` 60 naponta lejár — ilyenkor a napló
`[instagram] Küldés sikertelen` sorral jelez, és a Meta dashboardon kell újat generálni.
