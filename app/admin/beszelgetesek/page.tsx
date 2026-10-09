import Link from "next/link";
import { STATE_LABEL, convState, type ConvState } from "@/lib/stats";
import { listConversations } from "@/lib/store";
import { handOver, toggleConversation } from "../actions";
import { Empty, FromComment, Ignored, State, convName, when } from "../ui";

export const dynamic = "force-dynamic";

const ALLAPOTOK: { value: ConvState | "mind"; label: string }[] = [
  { value: "mind", label: "Minden állapot" },
  { value: "bot", label: STATE_LABEL.bot },
  { value: "atadva", label: STATE_LABEL.atadva },
  { value: "lezart", label: STATE_LABEL.lezart },
  { value: "kikapcsolt", label: STATE_LABEL.kikapcsolt },
];

export default async function Beszelgetesek({
  searchParams,
}: {
  searchParams: Promise<{ allapot?: string; q?: string }>;
}) {
  const { allapot = "mind", q = "" } = await searchParams;
  const kereses = q.trim().toLowerCase();

  const all = await listConversations(300);
  const rows = all.filter((c) => {
    if (allapot !== "mind" && convState(c) !== allapot) return false;
    if (!kereses) return true;
    // a DM-ben írónak nincs felhasználóneve, ezért az azonosítóra is keresünk
    return `${c.username ?? ""} ${c.id}`.toLowerCase().includes(kereses);
  });

  const szurt = allapot !== "mind" || Boolean(kereses);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">Beszélgetések</h1>
      <p className="mt-2 text-[15px] text-muted">
        {rows.length} találat{szurt ? ` a ${all.length} beszélgetésből` : ""}
      </p>

      {/* GET-es űrlap: a szűrés benne van a címsorban, megosztható és visszalépéskor megmarad */}
      <form className="mt-6 flex flex-wrap gap-2.5" method="get">
        <label className="sr-only" htmlFor="q">
          Keresés felhasználónévre
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Keresés felhasználónévre"
          className="field min-w-[200px] flex-1"
        />
        <label className="sr-only" htmlFor="allapot">
          Állapot
        </label>
        <select id="allapot" name="allapot" defaultValue={allapot} className="field sm:w-[200px]">
          {ALLAPOTOK.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-ghost">
          Szűrés
        </button>
      </form>

      <div className="mt-6">
        {rows.length === 0 ? (
          <Empty>
            {szurt ? (
              <>
                Erre a szűrésre nincs találat. Próbáld más állapottal, vagy{" "}
                <Link href="/admin/beszelgetesek" className="font-semibold text-green">
                  töröld a szűrést
                </Link>
                .
              </>
            ) : (
              <>
                Itt fog megjelenni minden beszélgetés: ki írt, mit, és hol tart a bot. Amint
                megérkezik az első üzenet vagy komment, itt lesz.
              </>
            )}
          </Empty>
        ) : (
          <div className="card divide-y divide-line">
            {rows.map((c) => (
              <div key={c.id} className="p-5">
                {/* mobilon egymás alatt: a szöveg kap teljes szélességet, a gombok alá kerülnek */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <Link
                    href={`/admin/beszelgetesek/${encodeURIComponent(c.id)}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate font-semibold">{convName(c)}</span>
                      <State conv={c} />
                      <FromComment conv={c} />
                      <Ignored conv={c} />
                    </div>
                    <p className="mt-1.5 truncate text-[15px] text-muted">
                      {c.messages.at(-1)?.text ?? "Még nincs üzenet ebben a beszélgetésben."}
                    </p>
                    <p className="mt-1 text-xs text-micro">{when(c.lastActivity)}</p>
                  </Link>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <form action={toggleConversation}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="on" value={c.botEnabled ? "0" : "1"} />
                      <button className="btn-ghost" type="submit">
                        {c.botEnabled ? "Bot ki" : "Bot be"}
                      </button>
                    </form>
                    {!c.handedOff && (
                      <form action={handOver}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="btn-ghost" type="submit">
                          Átadom embernek
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
