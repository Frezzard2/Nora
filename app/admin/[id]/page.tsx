import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/components/TopBar";
import { conversationExists, getConversation } from "@/lib/store";
import { toggleConversation } from "../actions";
import { State, money, when } from "../ui";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const convId = decodeURIComponent(id);
  // különben bármilyen URL-re egy üres fantom-beszélgetést rajzolnánk ki
  if (!(await conversationExists(convId))) notFound();
  const conv = await getConversation(convId);

  return (
    <>
      <TopBar tag="Admin">
        <Link href="/admin" className="btn-quiet">
          Vissza
        </Link>
      </TopBar>

      <main className="mx-auto max-w-[760px] px-4 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold leading-tight">{conv.id}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-muted">
              <State conv={conv} />
              <span>
                {money(conv.costUsd)} · {conv.tokens.input} be / {conv.tokens.output} ki token
              </span>
            </p>
          </div>

          <form action={toggleConversation}>
            <input type="hidden" name="id" value={conv.id} />
            <input type="hidden" name="on" value={conv.botEnabled ? "0" : "1"} />
            <button className="btn-ghost" type="submit">
              {conv.botEnabled ? "Bot kikapcsolása" : "Bot visszakapcsolása"}
            </button>
          </form>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {conv.messages.length === 0 && (
            <p className="card p-6 text-[15px] text-muted">Ebben a beszélgetésben nincs üzenet.</p>
          )}

          {conv.messages.map((m, i) => (
            <div
              key={`${m.at}-${i}`}
              className={m.role === "user" ? "max-w-[85%] self-start" : "max-w-[85%] self-end"}
            >
              <div
                className={`whitespace-pre-wrap rounded-[14px] px-4 py-3 text-[15px] leading-relaxed ${
                  m.role === "user" ? "bg-card border border-line" : "bg-green text-white"
                }`}
              >
                {m.text}
              </div>
              <p
                className={`mt-1 text-xs text-micro ${
                  m.role === "user" ? "text-left" : "text-right"
                }`}
              >
                {when(m.at)}
              </p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
