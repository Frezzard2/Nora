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

A konfigurációt az `/onboarding` varázslóval állítod össze, exportálod JSON-ba, és
a tartalmát bemásolod a **`config/client.json`** fájlba. Ebből dolgozik az élő bot.

> **Amíg ez nincs kitöltve, a bot nem válaszol** — az üzeneteket eltárolja, és az
> `/admin` oldal felül megmutatja, melyik mező hiányzik. Ez szándékos: éles fiókon
> rosszabb egy általánosságokat író bot, mint a csend. Kötelező mezők:
> `alapok.nev` (vagy `markanev`), `alapok.kinekMibenSegit`, `ajanlat.foSzolgaltatas`,
> `ajanlat.celLink`.

| Útvonal | Mi ez |
|---|---|
| `/onboarding` | Beállító varázsló (localStorage + JSON export) |
| `/simulator` | Teszt-chat, nem küld valódi üzenetet |
| `/admin` | Beszélgetések, kapcsolók, költség — jelszóval védve |
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

Utána a **messages** mezőre fel kell iratkozni (*Subscribe*). A `messaging_postbacks`
nem szükséges, a bot csak szöveget kezel.

### 5. Konfiguráció feltöltése

Nyisd meg a deployolt `/onboarding`-ot, menj végig a varázslón, **Exportálás** →
a letöltött JSON tartalmát írd a `config/client.json`-ba, commitold, deployolj újra.

Az `/admin` tetején lévő piros sáv addig látszik, amíg env változó vagy
konfigurációs mező hiányzik — ha eltűnt, minden a helyén van.

### 6. Teszt

Írj egy DM-et a fiókra **egy másik Instagram fiókról** (a sajátodnak küldött üzenet
echo-ként jön vissza, azt a webhook kiszűri). Pár másodperc után jön a válasz, és a
beszélgetés megjelenik az `/admin` felületen.

### 7. Publikálás (élő fiókhoz, fejlesztői módon túl)

Development módban csak az app szerepkörrel rendelkező fiókjai tudnak írni. Élesítéshez
az App Review-hoz kell: `instagram_business_basic`, `instagram_business_manage_messages`,
az adatvédelmi oldal URL-je (`/adatvedelem`), és egy képernyőfelvétel a működésről.

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
| `lib/instagram.ts` | Kimenő üzenet a Graph API-ra, darabolással és óránkénti korláttal |
| `lib/store.ts` | **Minden tárolás ezen megy át** (Upstash Redis) — cserélhető |
| `lib/signature.ts` | Az `X-Hub-Signature-256` ellenőrzése |
| `lib/chunk.ts` | 1000 karakteres darabolás |
| `lib/handover.ts` | Az „átadás embernek” jelölő feldolgozása |
| `middleware.ts` | HTTP Basic az `/admin` előtt |
| `app/api/webhook/route.ts` | A Meta webhook (GET verify, POST események) |

## Biztonsági korlátok

- Minden POST aláírás-ellenőrzésen megy át (HMAC SHA-256, időzítésbiztos összehasonlítás).
- Beszélgetésenkénti napi válaszkorlát: `MAX_REPLIES_PER_DAY` (alap: 20).
- Globális óránkénti küldési korlát: `IG_MAX_SENDS_PER_HOUR` (alap: 180).
- Globális vészkapcsoló az `/admin` felületen — azonnal elhallgattatja a botot.
- Duplikált kézbesítés szűrése `message.mid` alapján, 24 órás lejárattal.
- Titkok csak szerveroldalon: nincs `NEXT_PUBLIC_` kulcs, a `.env.local` nincs a repóban.
- Az admin kapcsolók csak már létező beszélgetést módosítanak (hamisított POST nem
  tud szemét rekordot írni a tárolóba).
- Kitöltetlen konfigurációval a bot nem válaszol.

## Másik fiókra átállítás

Nem kell új Meta app minden fiókhoz — egy app több Instagram fiókot is kezel.
Ami mihez tartozik:

| Érték | Mihez kötött |
|---|---|
| `IG_APP_SECRET` | az **apphoz** — fiókonként nem változik |
| `IG_VERIFY_TOKEN` | az apphoz (te találod ki) |
| `IG_ACCESS_TOKEN` | a **fiókhoz** — csak ez fiókspecifikus |
| Callback URL | az apphoz: **egy app = egy webhook URL** |

Fiókváltáshoz tehát elég: új `IG_ACCESS_TOKEN` + új `config/client.json`.

> **Egy apphoz csak egy Instagram fiókot kapcsolj be.** Ez single tenant MVP:
> egy `IG_ACCESS_TOKEN`, egy `config/client.json`, és a webhook nem nézi meg az
> `entry[].id`-ból, melyik fiókra jött az üzenet. Két bekapcsolt fiók esetén a
> másodiknak írók az első fiók nevében és hangnemén kapnának választ.
> Két fiók élesben = két app (mert egy app egy callback URL-t tud) + két deploy.

Az `IG_ACCESS_TOKEN` 60 naponta lejár — ilyenkor a napló
`[instagram] Küldés sikertelen` sorral jelez, és a Meta dashboardon kell újat generálni.
