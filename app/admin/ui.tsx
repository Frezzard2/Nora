import type { Conversation } from "@/lib/store";

export const money = (usd: number) => `$${usd.toFixed(usd < 1 ? 4 : 2)}`;

export const when = (at: number) =>
  new Date(at).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" });

/** Állapot-címke: az átadás a legfontosabb, utána a kikapcsolt bot. */
export function State({ conv }: { conv: Conversation }) {
  if (conv.handedOff)
    return (
      <span className="rounded-full bg-brick-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-brick">
        Átadva
      </span>
    );
  if (!conv.botEnabled)
    return (
      <span className="rounded-full bg-paper px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
        Bot ki
      </span>
    );
  return <span className="tag">Bot aktív</span>;
}
