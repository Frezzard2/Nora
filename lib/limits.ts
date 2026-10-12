/**
 * Költségvédelem: napi AI-költségplafon.
 *
 * A beszélgetésenkénti napi válaszkorlát (MAX_REPLIES_PER_DAY) és az óránkénti
 * küldési korlát (IG_MAX_SENDS_PER_HOUR) egy-egy beszélgetést, illetve a
 * kiküldést fogja vissza. Egyik sem véd az ellen, ha SOK beszélgetés fut
 * egyszerre — ezért kell egy globális, napi összeg-plafon is.
 *
 * Tiszta függvények, hogy önellenőrzéssel futtathatók legyenek.
 */

/**
 * Óvatos alapértelmezés. Egy beszélgetés tapasztalati költsége ~$0,03, tehát
 * ez nagyjából 60 beszélgetés naponta — egy kreátornak bőven elég, egy
 * elszabadult körnek viszont kemény mennyezet.
 */
export const DEFAULT_DAILY_COST_LIMIT_USD = 2;

/**
 * A napi plafon USD-ben.
 *
 * Érvénytelen vagy negatív érték NEM kapcsolhatja ki a védelmet — ilyenkor az
 * alapértelmezésre esünk vissza. A 0 viszont érvényes: „ma egy centet sem".
 */
export function dailyCostLimitUsd(raw: string | undefined = process.env.DAILY_COST_LIMIT_USD): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_DAILY_COST_LIMIT_USD;

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return DEFAULT_DAILY_COST_LIMIT_USD;
  return value;
}

/** Elértük-e a napi plafont? A plafonon ÁLLVA már nem indítunk új AI-hívást. */
export function overDailyCostLimit(todayUsd: number, limitUsd: number): boolean {
  if (!Number.isFinite(todayUsd)) return false;
  return todayUsd >= limitUsd;
}
