import Link from "next/link";
import { currentRole } from "@/lib/auth";
import { clientConfig } from "@/lib/clientConfig";
import { fetchOwnAccount } from "@/lib/instagram";
import { groupGaps } from "@/lib/gaps";
import { dailyCostLimitUsd, overDailyCostLimit } from "@/lib/limits";
import { configGaps, envGaps } from "@/lib/readiness";
import { duration, overview } from "@/lib/stats";
import {
  costSoFar,
  getEntryIds,
  getUnhandled,
  isBotEnabled,
  listConversations,
  listGaps,
} from "@/lib/store";
import { clearAnswerGaps, resetAccountIds, toggleGlobal } from "./actions";
import {
  Empty,
  FromComment,
  HumanAnswered,
  Ignored,
  Notice,
  Stat,
  State,
  convName,
  money,
  when,
} from "./ui";

export const dynamic = "force-dynamic";

/**
 * A legutóbbi feldolgozhatatlan webhook-esemény SZERKEZETE (kulcsok és típusok,
 * tartalom nélkül). Ebből derül ki, ha a Meta más mezőneveket küld, mint amit a
 * kód vár — tipikusan komment-eseménynél. Egy nap után magától eltűnik.
 */
async function Unhandled() {
  const last = await getUnhandled<{ at: string; shape: unknown }>();
  if (!last) return null;

  return (
    <div className="mt-4">
      <Notice kind="warn">
        <strong className="font-semibold">Feldolgozhatatlan webhook-esemény.</strong>
        <p className="mt-1.5">
          Érkezett egy esemény, amiből hiányoztak a várt mezők ({when(Date.parse(last.at))}). Ha
          komment-tesztet futtattál, valószínűleg más mezőnevet küldött a Meta. A tartalom nincs
          eltárolva, csak a szerkezet:
        </p>
        <pre className="mt-2 overflow-auto rounded-[8px] border border-brick/20 bg-card/60 p-3 text-[13px] leading-relaxed">
          {JSON.stringify(last.shape, null, 2)}
        </pre>
        <p className="mt-2 text-[13px]">Ez a jelzés egy nap után magától eltűnik.</p>
      </Notice>
    </div>
  );
}

/** Üzembe állítási figyelmeztetés — technikai, ezért csak a tulajdonosnak. */
async function Setup() {
  const env = envGaps();
  const resolved = await clientConfig();
  const config = configGaps(resolved.config);

  /**
   * Egy apphoz több Instagram fiók is köthető, és akkor MINDEGYIK eseménye ide
   * jön. Válaszolni csak a tokenünkhöz tartozó fiókban tudunk, a többinél az
   * AI-hívás kifizetődik, a válasz viszont nem megy ki — a magánbeszélgetéseid
   * pedig bekerülnek a tárolóba.
   *
   * Ezért már EGYETLEN rögzítetlen fióknál is szólunk, nem csak kettőnél: ha a
   * webhook nem a saját fiókodra érkezik, az egy fiókkal is baj, és pont azt
   * nem vennéd észre.
   */
  const own = process.env.IG_ACCOUNT_ID?.trim();
  const seen = await getEntryIds();
  const unpinned = !own && seen.length > 0 ? seen : [];
  const account = unpinned.length ? await fetchOwnAccount() : null;

  if (!env.length && !config.length && !resolved.error && !unpinned.length) return null;

  return (
    <div className="mt-6">
      <Notice kind="warn">
        <strong className="font-semibold">A beállítás még nincs kész.</strong>
        {env.length > 0 && (
          <p className="mt-1.5">
            Hiányzó környezeti változó: <code className="font-semibold">{env.join(", ")}</code>
          </p>
        )}
        {resolved.error && <p className="mt-1.5">{resolved.error}</p>}
        {unpinned.length > 0 && (
          <p className="mt-1.5">
            Nincs fiókhoz kötve a feldolgozás. Eddig ezekre a fiókokra érkezett webhook-esemény:{" "}
            <code className="font-semibold">{unpinned.join(", ")}</code>
            {account ? (
              <>
                {" "}— a tokenünk viszont a <strong>@{account.username}</strong> fiókhoz tartozik.
                Ha a fenti azonosítók között olyan is van, ami nem ez a fiók, akkor idegen
                postaláda üzeneteit dolgozzuk fel: az AI-hívás kifizetődik, a válasz nem megy ki, és
                a beszélgetések bekerülnek a tárolóba.
              </>
            ) : null}{" "}
            Állítsd be az <code className="font-semibold">IG_ACCOUNT_ID</code> env változót a saját
            fiókod azonosítójára, vagy a Meta dashboardon kapcsold ki a webhook-feliratkozást a
            többi fióknál.
          </p>
        )}
        {unpinned.length > 0 && (
          <form action={resetAccountIds} className="mt-3">
            <button type="submit" className="btn-ghost">
              Lista nullázása
            </button>
            <span className="mt-2 block text-[13px]">
              Miután a dashboardon átállítottad a feliratkozást, nullázd a listát, és írass egy
              DM-et a fiókodnak. Ami ezután megjelenik itt, az az élesben bekötött fiók —
              ezt az azonosítót kell az IG_ACCOUNT_ID-ba tenni.
            </span>
          </form>
        )}
        {config.length > 0 && (
          <p className="mt-1.5">
            Hiányzó mező a konfigurációban (forrás:{" "}
            <code className="font-semibold">{resolved.source}</code>):{" "}
            <code className="font-semibold">{config.join(", ")}</code> — amíg ez nincs kitöltve, a
            bot tárolja az üzeneteket, de nem válaszol.
          </p>
        )}
      </Notice>
    </div>
  );
}

export default async function Admin() {
  const role = await currentRole();
  const owner = role === "owner";

  // A költség összegét csak a tulajdonos látja, de a plafon betelését az
  // ügyfélnek is tudnia kell — különben nem érti, miért hallgat a bot.
  const [conversations, globalOn, cost, gaps] = await Promise.all([
    listConversations(),
    isBotEnabled(),
    costSoFar(),
    listGaps(),
  ]);
  // amire a bot elakadt — ezekből lesznek a hiányzó GYIK-bejegyzések
  const hianyzoValaszok = groupGaps(gaps).slice(0, 8);
  const costLimit = dailyCostLimitUsd();
  const costCapReached = overDailyCostLimit(cost.today, costLimit);

  const stats = overview(conversations);
  const latest = conversations.slice(0, 5);
  const avgPerConv = conversations.length
    ? conversations.reduce((sum, c) => sum + c.costUsd, 0) / conversations.length
    : 0;

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">Áttekintő</h1>

      {/* Nagy állapotjelző: egy pillantásból látszódjon, megy-e a bot. */}
      <div
        className={`mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border p-5 ${
          globalOn ? "border-green-line bg-green-soft" : "border-brick/30 bg-brick-soft"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <span
            className={`h-3.5 w-3.5 shrink-0 rounded-full ${globalOn ? "bg-green" : "bg-brick"}`}
            aria-hidden
          />
          <div>
            <p
              className={`font-display text-[20px] font-bold leading-tight ${
                globalOn ? "text-green-dark" : "text-brick"
              }`}
            >
              {globalOn ? "A bot be van kapcsolva" : "A bot le van állítva"}
            </p>
            <p className={`mt-1 text-sm ${globalOn ? "text-green-dark/80" : "text-brick/80"}`}>
              {globalOn
                ? "Az új üzenetekre és kommentekre válaszol."
                : "Az üzenetek megérkeznek és tárolódnak, de nincs válasz."}
            </p>
          </div>
        </div>

        {owner && (
          <form action={toggleGlobal}>
            <input type="hidden" name="on" value={globalOn ? "0" : "1"} />
            <button className={globalOn ? "btn-ghost" : "btn-primary"} type="submit">
              {globalOn ? "Bot leállítása" : "Bot visszakapcsolása"}
            </button>
          </form>
        )}
      </div>

      {costCapReached && (
        <div className="mt-6">
          <Notice kind="warn">
            <strong className="font-semibold">A napi AI-költségplafon betelt.</strong>
            <p className="mt-1.5">
              {owner
                ? `A mai becsült AI-költség $${cost.today.toFixed(2)}, a plafon $${costLimit}. A bot ma nem generál több választ — az üzenetek megérkeznek és tárolódnak. A plafon éjfélkor nullázódik, vagy emeld a DAILY_COST_LIMIT_USD env változót.`
                : "A bot ma elérte a napi korlátját, ezért nem válaszol új üzenetekre. Az üzenetek megérkeznek és itt megjelennek — holnap magától újraindul. Ha sürgős, szólj nekünk."}
            </p>
          </Notice>
        </div>
      )}

      {owner && (
        <>
          <Setup />
          <Unhandled />
        </>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Mai beszélgetések" value={String(stats.today)} />
        <Stat label="Elmúlt 7 nap" value={String(stats.week)} />
        <Stat
          label="Végig a bot kezelte"
          value={String(stats.botHandled)}
          note={`${stats.handedOff} beszélgetés került emberhez`}
        />
        <Stat
          label="Átlagos válaszidő"
          value={stats.avgResponseMs === null ? "—" : duration(stats.avgResponseMs, true)}
          note={
            stats.avgResponseMs === null
              ? "Még nincs mérhető válasz."
              : `Pontosan: ${duration(stats.avgResponseMs)}`
          }
        />
      </div>

      {hianyzoValaszok.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[20px] font-bold">Amire nem tudott válaszolni</h2>
          <p className="mt-1.5 max-w-[640px] text-[15px] leading-relaxed text-muted">
            Ezeket a kérdéseket kapta a bot, és nem tudott rájuk válaszolni — ilyenkor átadja a
            beszélgetést. Ha felveszed őket a gyakori kérdések közé, legközelebb magától válaszol.
          </p>

          <div className="card mt-4 divide-y divide-line">
            {hianyzoValaszok.map((gap) => (
              <div key={`${gap.convId}-${gap.at}`} className="flex flex-wrap items-start gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-relaxed">{gap.question}</span>
                  <span className="mt-1 block text-xs text-micro">
                    {gap.username ? `@${gap.username} · ` : ""}
                    {when(gap.at)}
                  </span>
                </span>
                {gap.count > 1 && (
                  <span className="tag shrink-0">{gap.count}× kérdezték</span>
                )}
                <Link
                  href={`/admin/beszelgetesek/${encodeURIComponent(gap.convId)}`}
                  className="shrink-0 text-[15px] font-semibold text-green"
                >
                  Megnézem
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link href="/admin/beallitasok" className="btn-primary">
              Felveszem a gyakori kérdések közé
            </Link>
            <form action={clearAnswerGaps}>
              <button type="submit" className="btn-quiet">
                Letisztáztam, lista törlése
              </button>
            </form>
          </div>
        </section>
      )}

      {owner && (
        <>
          <h2 className="mt-10 text-[20px] font-bold">AI-költség</h2>
          <p className="mt-1.5 text-[15px] text-muted">
            Becsült összeg a modell token-árai alapján. Csak te látod.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Stat label="Ma" value={money(cost.today)} />
            <Stat label="Ebben a hónapban" value={money(cost.month)} />
            <Stat
              label="Beszélgetésenkénti átlag"
              value={conversations.length ? money(avgPerConv) : "—"}
              note={`${conversations.length} tárolt beszélgetés`}
            />
          </div>
        </>
      )}

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[20px] font-bold">Legutóbbi beszélgetések</h2>
        <Link href="/admin/beszelgetesek" className="text-[15px] font-semibold text-green">
          Mind megnyitása
        </Link>
      </div>

      <div className="mt-4">
        {latest.length === 0 ? (
          <Empty>
            Itt fognak megjelenni a beszélgetések, ahogy megérkeznek. Írj a fiókodnak egy DM-et, vagy
            kommentelj egy posztod alá — az első pár percen belül itt lesz.
          </Empty>
        ) : (
          <div className="card divide-y divide-line">
            {latest.map((c) => (
              <Link
                key={c.id}
                href={`/admin/beszelgetesek/${encodeURIComponent(c.id)}`}
                className="block p-5 transition hover:bg-paper"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 truncate font-semibold">{convName(c)}</span>
                  <State conv={c} />
                  <FromComment conv={c} />
                  <Ignored conv={c} />
                  <HumanAnswered conv={c} />
                </div>
                <p className="mt-1.5 truncate text-[15px] text-muted">
                  {c.messages.at(-1)?.text ?? "Még nincs üzenet ebben a beszélgetésben."}
                </p>
                <p className="mt-1 text-xs text-micro">{when(c.lastActivity)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
