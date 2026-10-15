import type { Conversation } from "./store.ts";

/**
 * Az áttekintő oldal számai. Tiszta függvények a már beolvasott
 * beszélgetéseken — nincs külön statisztika-tároló, amit szinkronban kell tartani.
 */

/** Hét nap tétlenség után a beszélgetést lezártnak tekintjük. */
export const LEZART_UTAN_MS = 7 * 24 * 60 * 60 * 1000;

export type ConvState = "bot" | "atadva" | "lezart" | "kikapcsolt";

export function convState(conv: Conversation, now = Date.now()): ConvState {
  if (conv.handedOff) return "atadva";
  if (!conv.botEnabled) return "kikapcsolt";
  if (now - conv.lastActivity > LEZART_UTAN_MS) return "lezart";
  return "bot";
}

export const STATE_LABEL: Record<ConvState, string> = {
  bot: "Bot kezeli",
  atadva: "Átadva",
  lezart: "Lezárt",
  kikapcsolt: "Bot kikapcsolva",
};

/**
 * Napkulcs magyar idő szerint. A szerver UTC-ben fut, ezért a „mai" nem
 * egyezne a felhasználó napjával — a zónát az Intl számolja, nem mi.
 */
const DAY = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" });
export const dayKey = (at: number) => DAY.format(at);

export type Overview = {
  /** ma, illetve az elmúlt 7 napban aktív beszélgetések */
  today: number;
  week: number;
  /** végig a bot kezelte (volt válasza, és nem került emberhez) */
  botHandled: number;
  handedOff: number;
  /** átlagos válaszidő milliszekundumban, vagy null, ha még nincs mérhető adat */
  avgResponseMs: number | null;
};

export function overview(convs: Conversation[], now = Date.now()): Overview {
  const today = dayKey(now);
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  let todayCount = 0;
  let weekCount = 0;
  let botHandled = 0;
  let handedOff = 0;
  let responseSum = 0;
  let responseCount = 0;

  for (const conv of convs) {
    if (conv.messages.some((m) => dayKey(m.at) === today)) todayCount++;
    if (conv.messages.some((m) => m.at >= weekAgo)) weekCount++;

    if (conv.handedOff) handedOff++;
    else if (conv.messages.some((m) => m.role === "assistant" && m.by !== "human")) botHandled++;

    /**
     * Válaszidő: egy bejövő üzenet és az utána következő első BOT-válasz között.
     * A kézzel írt válasz nem számít bele — az órákkal később is jöhet, és a
     * bot sebességét mérjük, nem az emberét. Ilyenkor az ablakot lezárjuk,
     * de nem könyveljük el.
     */
    let pending: number | null = null;
    for (const m of conv.messages) {
      if (m.role === "user") {
        if (pending === null) pending = m.at;
      } else if (pending !== null) {
        if (m.by !== "human") {
          responseSum += Math.max(0, m.at - pending);
          responseCount++;
        }
        pending = null;
      }
    }
  }

  return {
    today: todayCount,
    week: weekCount,
    botHandled,
    handedOff,
    avgResponseMs: responseCount ? Math.round(responseSum / responseCount) : null,
  };
}

/**
 * Emberi időtartam: „4 másodperc", „2 perc 10 másodperc".
 * A rövid alak csak a legnagyobb egységet adja vissza — számlapra ez fér el.
 */
export function duration(ms: number, compact = false): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} másodperc`;

  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  if (min < 60) return rest && !compact ? `${min} perc ${rest} másodperc` : `${min} perc`;

  const hour = Math.floor(min / 60);
  return compact ? `${hour} óra` : `${hour} óra ${min % 60} perc`;
}
