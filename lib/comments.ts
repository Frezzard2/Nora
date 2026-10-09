import "server-only";
import { MAX_LEN } from "./chunk.ts";
import { GRAPH_VERSION } from "./instagram.ts";
import { bump, markOwnComment, rememberSent } from "./store.ts";

/**
 * Komment-indította beszélgetés: privát válasz DM-ben és nyilvános válasz a
 * komment alá. A mezőneveket a Meta dokumentációja adja:
 *
 * - privát válasz: POST /{IG_ID}/messages, a recipient-ben comment_id (NEM user ID)
 *   https://developers.facebook.com/docs/instagram-platform/private-replies
 * - nyilvános válasz: POST /{IG_COMMENT_ID}/replies, body: { "message": "..." }
 *   https://developers.facebook.com/docs/instagram-platform/comment-moderation
 *
 * Meta-korlátok, amiket a kód betart:
 * - egy kommentre ÖSSZESEN egy privát üzenet mehet (lásd store.firstPrivateReply)
 * - a privát válaszra 7 nap az ablak a komment megjelenése után
 * - a válasz EGY üzenet, tehát nem darabolható — ezért vágunk, nem chunkolunk
 */

const HOST = `https://graph.instagram.com/${GRAPH_VERSION}`;

/** Ugyanaz az óránkénti korlát, mint a DM-eknél — egy kvótából megy. */
const HOURLY_LIMIT = Number(process.env.IG_MAX_SENDS_PER_HOUR ?? 180);

type MetaError = { error?: { message?: string; code?: number; error_subcode?: number } };

/** A Meta hibáját emberi szöveggé fordítja, a tokent soha nem logoljuk. */
function describe(status: number, body: MetaError): string {
  const e = body.error ?? {};
  return (
    `HTTP ${status}: ${e.message ?? "nincs hibaleírás"}` +
    (e.code ? ` [code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""}]` : "")
  );
}

async function underLimit(): Promise<boolean> {
  const hour = new Date().toISOString().slice(0, 13);
  return (await bump(`send:${hour}`, 3600)) <= HOURLY_LIMIT;
}

/**
 * Privát DM a kommentelőnek. A hívó felel azért, hogy ez a komment még nem
 * kapott privát választ (store.firstPrivateReply).
 */
export async function sendPrivateReply(commentId: string, text: string): Promise<boolean> {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) {
    console.error("[comments] IG_ACCESS_TOKEN nincs beállítva — a privát válasz nem ment ki.");
    return false;
  }
  if (!(await underLimit())) {
    console.error(`[comments] Óránkénti küldési korlát (${HOURLY_LIMIT}) elérve.`);
    return false;
  }

  // egy üzenet a teljes keret: ami nem fér bele, az lemarad, ezért vágunk
  const body = text.trim().slice(0, MAX_LEN);
  // a visszhang a küldés válasza előtt is megérkezhet — előbb jegyezzük fel
  await rememberSent(body);

  try {
    const res = await fetch(`${HOST}/me/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text: body } }),
    });

    if (!res.ok) {
      console.error(
        `[comments] Privát válasz sikertelen (${describe(res.status, await res.json().catch(() => ({})))}).`,
      );
      return false;
    }
    console.info(`[comments] Privát válasz elküldve (${body.length} karakter) → ${commentId}`);
    return true;
  } catch (err) {
    console.error("[comments] Hálózati hiba privát válasznál:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Nyilvános válasz a komment alá. */
export async function sendPublicReply(commentId: string, text: string): Promise<void> {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) {
    console.error("[comments] IG_ACCESS_TOKEN nincs beállítva — a nyilvános válasz nem ment ki.");
    return;
  }
  if (!(await underLimit())) {
    console.error(`[comments] Óránkénti küldési korlát (${HOURLY_LIMIT}) elérve.`);
    return;
  }

  try {
    const res = await fetch(`${HOST}/${encodeURIComponent(commentId)}/replies`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: text.trim().slice(0, MAX_LEN) }),
    });

    const payload = (await res.json().catch(() => ({}))) as MetaError & { id?: string };
    if (!res.ok) {
      console.error(`[comments] Nyilvános válasz sikertelen (${describe(res.status, payload)}).`);
      return;
    }

    // a saját kommentünkről is kapunk webhookot — enélkül magunkra reagálnánk
    if (payload.id) await markOwnComment(payload.id);
    console.info(`[comments] Nyilvános válasz kiírva ${commentId} alá.`);
  } catch (err) {
    console.error("[comments] Hálózati hiba nyilvános válasznál:", err instanceof Error ? err.message : err);
  }
}
