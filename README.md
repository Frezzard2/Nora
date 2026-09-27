# Nora — demó

AI üzenet-asszisztens coachoknak és kreátoroknak. Next.js (App Router) + Tailwind + TypeScript.

## Indítás

```bash
cp .env.example .env.local     # és írd bele az ANTHROPIC_API_KEY-t
npm install
npm run dev
```

- `/onboarding` — 7 szekciós beállító varázsló, a konfiguráció localStorage-ban, export/import JSON-nal
- `/simulator` — 5 csatorna, teszt-szcenáriók, „átadva embernek” jelzés

## Felépítés

| Fájl | Szerep |
|---|---|
| `lib/brand.ts` | **A márkanév egyetlen helye.** Itt cseréld. |
| `lib/types.ts` | A konfiguráció JSON sémája |
| `lib/prompt.ts` | Rendszerprompt építése a konfigból |
| `lib/reply-engine.ts` | Válaszgenerálás (Anthropic) — csatorna-független belépési pont |
| `lib/handover.ts` | Az „átadás embernek” jelölő feldolgozása (`npm run check`) |
| `lib/channels.ts` | Csatorna-adapterek; a `send` metódusba jön a valódi platform-API |
| `app/api/reply/route.ts` | Szerver oldali route — az API kulcs sosem megy ki a kliensre |

Új funkció (fizetési emlékeztető, utánkövetés) a `reply-engine` köré épül, nem a UI-ba.
