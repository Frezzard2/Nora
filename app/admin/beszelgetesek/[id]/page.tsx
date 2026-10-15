import Link from "next/link";
import { notFound } from "next/navigation";
import { currentRole } from "@/lib/auth";
import { conversationExists, getConversation } from "@/lib/store";
import { handOver, toggleConversation, toggleIgnore } from "../../actions";
import { Empty, FromComment, Ignored, Notice, State, convName, money, when } from "../../ui";

export const dynamic = "force-dynamic";

export default async function Beszelgetes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const convId = decodeURIComponent(id);
  // különben bármilyen URL-re egy üres fantom-beszélgetést rajzolnánk ki
  if (!(await conversationExists(convId))) notFound();

  const [conv, role] = await Promise.all([getConversation(convId), currentRole()]);

  return (
    <main className="mx-auto max-w-[780px] px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/beszelgetesek" className="text-[15px] font-semibold text-green">
        ← Vissza a beszélgetésekhez
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-[24px] font-bold leading-tight">{convName(conv)}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <State conv={conv} />
            <FromComment conv={conv} />
            <Ignored conv={conv} />
          </div>
          {conv.source === "comment" && (
            <p className="mt-2 text-[13px] text-micro">
              Kommentből indult{conv.postId ? ` — poszt: ${conv.postId}` : ""}
            </p>
          )}
          {role === "owner" && (
            <p className="mt-2 text-[13px] text-micro">
              {money(conv.costUsd)} · {conv.tokens.input} be / {conv.tokens.output} ki token
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <form action={toggleConversation}>
            <input type="hidden" name="id" value={conv.id} />
            <input type="hidden" name="on" value={conv.botEnabled ? "0" : "1"} />
            <button className="btn-ghost" type="submit">
              {conv.botEnabled ? "Bot kikapcsolása" : "Bot visszakapcsolása"}
            </button>
          </form>
          {!conv.handedOff && (
            <form action={handOver}>
              <input type="hidden" name="id" value={conv.id} />
              <button className="btn-primary" type="submit">
                Átadom embernek
              </button>
            </form>
          )}
          <form action={toggleIgnore}>
            <input type="hidden" name="id" value={conv.id} />
            <input type="hidden" name="on" value={conv.ignored ? "0" : "1"} />
            <button className="btn-ghost" type="submit">
              {conv.ignored ? "Mégis figyeljük" : "Figyelmen kívül hagyom"}
            </button>
          </form>
        </div>
      </div>

      {conv.ignored && (
        <div className="mt-5">
          <Notice kind="warn">
            Ez a fiók figyelmen kívül van hagyva: a bot sem a DM-jeire, sem a
            kommentjeire nem reagál, és az új üzeneteit nem is tároljuk. Ide a saját
            személyes fiókod való — onnan írva a bot különben válaszolna neked.
          </Notice>
        </div>
      )}

      {conv.handedOff && (
        <div className="mt-5">
          <Notice kind="warn">
            Ezt a beszélgetést átadtuk embernek — a bot nem válaszol rá. Ha mégis folytassa, kapcsold
            vissza a botot a fenti gombbal.
          </Notice>
        </div>
      )}

      <div className="mt-7 flex flex-col gap-3">
        {conv.messages.length === 0 ? (
          <Empty>Ebben a beszélgetésben még nincs üzenet.</Empty>
        ) : (
          conv.messages.map((m, i) => (
            <div
              key={`${m.at}-${i}`}
              className={`max-w-[85%] ${m.role === "user" ? "self-start" : "self-end"}`}
            >
              <div
                className={`whitespace-pre-wrap rounded-[14px] px-4 py-3 text-[15px] leading-relaxed ${
                  m.role === "user"
                    ? "border border-line bg-card"
                    : m.by === "human"
                      ? "bg-ink text-white"
                      : "bg-green text-white"
                }`}
              >
                {m.text}
              </div>
              <p
                className={`mt-1 text-xs text-micro ${
                  m.role === "user" ? "text-left" : "text-right"
                }`}
              >
                {m.role === "user"
                  ? "Érdeklődő"
                  : m.by === "human"
                    ? "Kézzel válaszolva"
                    : "Asszisztens"}{" "}
                · {when(m.at)}
              </p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
