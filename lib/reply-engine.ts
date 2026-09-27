import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { parseReply } from "./handover";
import { buildSystemPrompt } from "./prompt";
import type { NoraConfig } from "./types";

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export type IncomingMessage = {
  /** honnan jött az üzenet — a motort ez nem érdekli, csak továbbadja */
  source: string;
  role: "user" | "assistant";
  text: string;
};

export type ReplyResult = {
  text: string;
  /** true, ha a beszélgetést embernek kell átadni */
  handover: boolean;
};

let client: Anthropic | null = null;

/**
 * Szervezeti szintű (nem workspace-hez kötött) API kulcsnál az API megköveteli
 * az anthropic-workspace-id headert. Workspace-scoped kulcsnál nem kell.
 */
const getClient = () => {
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  return (client ??= new Anthropic(
    workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {},
  ));
};

/**
 * Egyetlen belépési pont a válaszgeneráláshoz. Mindegy, honnan jön az üzenet
 * (chat szimulátor, valódi csatorna-webhook, későbbi utánkövetés-modul).
 */
export async function generateReply(
  config: NoraConfig,
  history: IncomingMessage[],
): Promise<ReplyResult> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 512,
    // a rendszerprompt stabil → gyorsítótárazható a beszélgetés minden körében
    system: [
      { type: "text", text: buildSystemPrompt(config), cache_control: { type: "ephemeral" } },
    ],
    messages: history.map((m) => ({ role: m.role, content: m.text })),
  });

  return parseReply(
    response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(""),
  );
}
