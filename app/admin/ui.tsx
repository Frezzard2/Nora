import type { ReactNode } from "react";
import { STATE_LABEL, convState } from "@/lib/stats";
import type { Conversation } from "@/lib/store";

export const money = (usd: number) => `$${usd.toFixed(usd < 1 ? 4 : 2)}`;

export const when = (at: number) =>
  new Date(at).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" });

/** A kommentelőnek van felhasználóneve, a DM-ben írónak nincs — csak opak azonosító. */
export const convName = (c: Conversation) => (c.username ? `@${c.username}` : c.id);

const BADGE =
  "whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]";

const STATE_STYLE: Record<string, string> = {
  bot: "bg-green-soft text-green-dark",
  atadva: "bg-brick-soft text-brick",
  lezart: "bg-paper text-micro",
  kikapcsolt: "bg-paper text-muted",
};

/** Állapot-címke: az átadás a legfontosabb, utána a kikapcsolt bot. */
export function State({ conv }: { conv: Conversation }) {
  const state = convState(conv);
  return <span className={`${BADGE} ${STATE_STYLE[state]}`}>{STATE_LABEL[state]}</span>;
}

/** „Kommentből indult" jelzés — a posztot is megmutatja, ha tudjuk. */
export function FromComment({ conv }: { conv: Conversation }) {
  if (conv.source !== "comment") return null;
  return (
    <span className={`${BADGE} border border-line bg-card text-muted`} title={conv.postId}>
      Kommentből
    </span>
  );
}

/** Az utolsó üzenetet ember írta kézzel — a beszélgetést valaki felvette. */
export function HumanAnswered({ conv }: { conv: Conversation }) {
  const last = conv.messages.at(-1);
  if (last?.role !== "assistant" || last.by !== "human") return null;
  return <span className={`${BADGE} bg-ink text-white`}>Kézzel megválaszolva</span>;
}

/** Figyelmen kívül hagyott fiók — a bot ide soha nem válaszol. */
export function Ignored({ conv }: { conv: Conversation }) {
  if (!conv.ignored) return null;
  return <span className={`${BADGE} border border-line bg-paper text-muted`}>Figyelmen kívül</span>;
}

/** Egy szám az áttekintőn. */
export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-5">
      <p className="micro">{label}</p>
      <p className="mt-2 font-display text-[28px] font-bold leading-none">{value}</p>
      {note ? <p className="mt-2 text-[13px] leading-snug text-muted">{note}</p> : null}
    </div>
  );
}

/** Üres állapot: egy mondat arról, mi fog ide kerülni. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="card p-6 text-[15px] leading-relaxed text-muted">{children}</p>;
}

/** Visszajelzés-sáv. */
export function Notice({ kind, children }: { kind: "info" | "warn"; children: ReactNode }) {
  return (
    <div
      className={`rounded-[10px] border px-4 py-3.5 text-[15px] leading-relaxed ${
        kind === "warn"
          ? "border-brick/30 bg-brick-soft text-brick"
          : "border-green-line bg-green-soft text-green-dark"
      }`}
    >
      {children}
    </div>
  );
}

/** Csontváz a betöltés idejére — hogy ne ugráljon a felület. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[10px] bg-line/60 ${className}`} />;
}
