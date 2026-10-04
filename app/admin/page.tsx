import Link from "next/link";
import TopBar from "@/components/TopBar";
import { clientConfig } from "@/lib/clientConfig";
import { configGaps, envGaps } from "@/lib/readiness";
import { isBotEnabled, listConversations, type Conversation } from "@/lib/store";
import { toggleConversation, toggleGlobal } from "./actions";
import { State, money, when } from "./ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nora — admin" };

const lastText = (c: Conversation) => c.messages.at(-1)?.text ?? "(még nincs üzenet)";

/** Üzembe állítási figyelmeztetés — ebből látszik, mi hiányzik még. */
async function Setup() {
  const env = envGaps();
  const resolved = await clientConfig();
  const config = configGaps(resolved.config);
  if (!env.length && !config.length && !resolved.error) return null;

  return (
    <div className="mt-6 rounded-[10px] border border-brick/30 bg-brick-soft px-4 py-3.5 text-[15px] leading-relaxed text-brick">
      <strong className="font-semibold">A beállítás még nincs kész.</strong>
      {env.length > 0 && (
        <p className="mt-1.5">
          Hiányzó környezeti változó: <code className="font-semibold">{env.join(", ")}</code>
        </p>
      )}
      {resolved.error && <p className="mt-1.5">{resolved.error}</p>}
      {config.length > 0 && (
        <p className="mt-1.5">
          Hiányzó mező a konfigurációban (forrás:{" "}
          <code className="font-semibold">
            {resolved.source}
          </code>
          ): <code className="font-semibold">{config.join(", ")}</code> — amíg ez nincs kitöltve, a
          bot tárolja az üzeneteket, de nem válaszol.
        </p>
      )}
    </div>
  );
}

export default async function Admin() {
  const [conversations, globalOn] = await Promise.all([listConversations(), isBotEnabled()]);
  const totalCost = conversations.reduce((sum, c) => sum + c.costUsd, 0);
  const { source } = await clientConfig();

  return (
    <>
      <TopBar tag="Admin">
        <Link href="/onboarding" className="btn-quiet">
          Konfiguráció szerkesztése
        </Link>
      </TopBar>

      <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-bold leading-tight sm:text-[38px]">Beszélgetések</h1>
            <p className="mt-2 text-[15px] text-muted">
              {conversations.length} beszélgetés · összesített AI-költség{" "}
              <strong className="text-ink">{money(totalCost)}</strong> · konfiguráció:{" "}
              <code>{source}</code>
            </p>
          </div>

          <form action={toggleGlobal}>
            <input type="hidden" name="on" value={globalOn ? "0" : "1"} />
            <button
              className={globalOn ? "btn-ghost" : "btn-primary"}
              type="submit"
              aria-label={globalOn ? "Bot leállítása mindenhol" : "Bot visszakapcsolása"}
            >
              {globalOn ? "Vészkapcsoló: bot leállítása" : "Bot visszakapcsolása"}
            </button>
          </form>
        </div>

        <Setup />

        {!globalOn && (
          <p className="mt-6 rounded-[10px] border border-brick/30 bg-brick-soft px-4 py-3 text-[15px] text-brick">
            A bot globálisan le van állítva. Az üzenetek megérkeznek és tárolódnak, de nincs válasz.
          </p>
        )}

        <div className="card mt-8 divide-y divide-line">
          {conversations.length === 0 && (
            <p className="p-6 text-[15px] text-muted">
              Még nincs beszélgetés. Írj a fiókodnak egy DM-et, és itt megjelenik.
            </p>
          )}

          {conversations.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-4 p-5">
              <Link href={`/admin/${encodeURIComponent(c.id)}`} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{c.id}</span>
                  <State conv={c} />
                </div>
                <p className="mt-1.5 truncate text-[15px] text-muted">{lastText(c)}</p>
                <p className="mt-1 text-xs text-micro">
                  {when(c.lastActivity)} · {money(c.costUsd)} · {c.tokens.input + c.tokens.output}{" "}
                  token
                </p>
              </Link>

              <form action={toggleConversation}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="on" value={c.botEnabled ? "0" : "1"} />
                <button className="btn-ghost" type="submit">
                  {c.botEnabled ? "Bot ki" : "Bot be"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
