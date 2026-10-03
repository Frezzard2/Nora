/** Az Instagram DM felső határa; ennél hosszabb szöveget darabolni kell. */
export const MAX_LEN = 1000;

/** Szóhatáron darabol, hogy ne szakadjon szó közepén. */
export function chunk(text: string, max = MAX_LEN): string[] {
  const parts: string[] = [];
  let rest = text.trim();

  while (rest.length > max) {
    const head = rest.slice(0, max + 1);
    const cut = Math.max(head.lastIndexOf("\n"), head.lastIndexOf(" "));
    // ha nincs értelmes szóhatár a limit második felében, kényszerített vágás
    const at = cut > max / 2 ? cut : max;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}
