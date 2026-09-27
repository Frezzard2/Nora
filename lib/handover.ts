/** Az asszisztens az átadást az üzenet első sorában jelzi ezzel a jelölővel. */
export const HANDOVER_MARK = "[ATADAS]";

export type ParsedReply = { text: string; handover: boolean };

export function parseReply(raw: string): ParsedReply {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(HANDOVER_MARK)) return { text: trimmed, handover: false };
  return { text: trimmed.slice(HANDOVER_MARK.length).trim(), handover: true };
}
