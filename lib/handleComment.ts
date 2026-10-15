import "server-only";
import { clientConfig } from "./clientConfig";
import { matchRule, pickPublic } from "./comment-rules";
import { sendPrivateReply, sendPublicReply } from "./comments";
import { isUsefulQuestion, MAX_QUESTION_LENGTH } from "./gaps";
import { dailyCostLimitUsd, overDailyCostLimit } from "./limits";
import { generateReply, type IncomingMessage } from "./reply-engine";
import { configGaps } from "./readiness";
import {
  bump,
  bumpCost,
  costSoFar,
  noteGap,
  bumpRuleHit,
  firstPrivateReply,
  getConversation,
  isBotEnabled,
  update,
  type StoredMessage,
} from "./store";

/** Ugyanaz a napi korlát, mint a DM-eknél — egy beszélgetés egy keretből megy. */
const DAILY_LIMIT = Number(process.env.MAX_REPLIES_PER_DAY ?? 20);

const toIncoming = (m: StoredMessage): IncomingMessage => ({
  source: "instagram",
  role: m.role,
  text: m.text,
});

export type IncomingComment = {
  commentId: string;
  /** a kommentelő Instagram-scoped azonosítója — ugyanaz, mint a DM-ek sender ID-ja */
  userId: string;
  username?: string;
  text: string;
  /** a poszt (média) azonosítója */
  mediaId?: string;
  /** a szülő komment azonosítója, ha ez egy válasz-komment */
  parentId?: string;
};

/**
 * Egy bejövő komment feldolgozása: szabály-illesztés, nyilvános és privát válasz.
 *
 * A beszélgetés ugyanabba az állapotba kerül, mint egy sima DM (ugyanaz a kulcs,
 * a kommentelő azonosítója), csak `source: "comment"` jelzéssel — így ha az
 * illető utána ír, a bot folytatja, és az embernek átadás is ugyanúgy működik.
 */
export async function handleComment(c: IncomingComment): Promise<void> {
  if (!(await isBotEnabled())) {
    console.info("[komment] Globális vészkapcsoló ki van kapcsolva — nincs válasz.");
    return;
  }

  const { config, source } = await clientConfig();
  const rule = matchRule(config.commentRules, { text: c.text, mediaId: c.mediaId });
  if (!rule) {
    console.info(`[komment] Egy szabály sem illeszkedik (${c.commentId}) — nem válaszolunk.`);
    return;
  }

  const conv = await getConversation(c.userId);
  if (conv.ignored) {
    console.info(`[komment] ${c.userId}: figyelmen kívül hagyott fiók, nincs feldolgozás.`);
    return;
  }

  await bumpRuleHit(rule.id);
  console.info(
    `[komment] ${c.commentId}: a „${rule.nev || rule.id}" szabály illeszkedik` +
      `${c.parentId ? " (válasz-komment)" : ""}.`,
  );

  // A nyilvános válasz független a privát üzenettől: statikus szöveg, nem kerül pénzbe,
  // és akkor is kimegy, ha a privát válasz már elment erre a kommentre.
  const publicText = pickPublic(rule);
  if (publicText) await sendPublicReply(c.commentId, publicText);

  // Meta-korlát: egy kommentre összesen EGY privát üzenet. Ezt a kapu előtt
  // ellenőrizzük, hogy fölösleges AI-hívást se fizessünk ki.
  if (!(await firstPrivateReply(c.commentId))) {
    console.info(`[komment] ${c.commentId}: erre a kommentre már ment privát válasz, kihagyva.`);
    return;
  }

  if (conv.handedOff || !conv.botEnabled) {
    console.info(`[komment] ${c.userId}: a bot ezen a beszélgetésen hallgat, nincs privát válasz.`);
    return;
  }

  const day = new Date().toISOString().slice(0, 10);
  if ((await bump(`reply:${c.userId}:${day}`, 60 * 60 * 24)) > DAILY_LIMIT) {
    console.warn(`[komment] Napi válaszkorlát (${DAILY_LIMIT}) elérve ezen a beszélgetésen.`);
    return;
  }

  let body = rule.privatSzoveg.trim();
  let usage: { inputTokens: number; outputTokens: number; costUsd: number } | undefined;
  let handover = false;

  if (!body) {
    // Az AI csak kitöltött konfigurációval ír értelmes választ. Statikus szövegnél
    // ez nem kell — ezért csak itt vizsgáljuk.
    const gaps = configGaps(config);
    if (gaps.length) {
      console.error(
        `[komment] A konfiguráció hiányos (${gaps.join(", ")}), forrás: ${source} — nincs válasz. ` +
          "Töltsd ki az /admin/beallitasok oldalon, vagy adj meg a szabálynál kész szöveget.",
      );
      return;
    }

    // Napi AI-költségplafon — csak itt számít: a kész szöveges szabály ingyen van.
    const costLimit = dailyCostLimitUsd();
    const { today: costToday } = await costSoFar();
    if (overDailyCostLimit(costToday, costLimit)) {
      console.error(
        `[komment] Napi AI-költségplafon elérve ($${costToday.toFixed(4)} / $${costLimit}) — ` +
          "ma nincs AI-generált privát válasz.",
      );
      return;
    }

    try {
      const reply = await generateReply(config, [
        ...conv.messages.map(toIncoming),
        {
          source: "instagram",
          role: "user",
          text: `A következő kommentet írta a bejegyzésed alá: „${c.text}"`,
        },
      ]);
      body = reply.text.trim();
      handover = reply.handover;
      usage = reply.usage;
    } catch (err) {
      console.error(
        "[komment] Válaszgenerálás sikertelen:",
        err instanceof Error ? err.message : err,
      );
      return;
    }
  }

  if (!body) {
    console.warn(`[komment] ${c.commentId}: üres válasz, nem küldünk semmit.`);
    return;
  }

  const sent = await sendPrivateReply(c.commentId, body);
  if (usage?.costUsd) await bumpCost(usage.costUsd);

  // lásd handleMessage: az átadást kiváltó kérdés a hiányzó GYIK-bejegyzés
  if (handover && isUsefulQuestion(c.text)) {
    await noteGap({
      question: c.text.slice(0, MAX_QUESTION_LENGTH),
      at: Date.now(),
      convId: c.userId,
      username: c.username ?? conv.username,
    });
  }

  const at = Date.now();
  await update(c.userId, (prev) => ({
    ...prev,
    source: "comment",
    postId: c.mediaId ?? prev.postId,
    username: c.username ?? prev.username,
    handedOff: prev.handedOff || handover,
    messages: [
      ...prev.messages,
      { role: "user" as const, text: c.text, at },
      ...(sent ? [{ role: "assistant" as const, text: body, at: at + 1 }] : []),
    ],
    lastActivity: at,
    tokens: {
      input: prev.tokens.input + (usage?.inputTokens ?? 0),
      output: prev.tokens.output + (usage?.outputTokens ?? 0),
    },
    costUsd: prev.costUsd + (usage?.costUsd ?? 0),
  }));
}
