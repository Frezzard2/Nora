"use client";

import { Field, Toggle } from "@/components/form";
import { Panel } from "@/components/config-sections";
import { MINDEN_POSZT, emptyRule, type CommentRule, type NoraConfig } from "@/lib/types";

/**
 * A komment-szabályok szerkesztője. Két helyen jelenik meg: a beállítások
 * oldalon utolsó szekcióként, és az /admin/kommentek oldalon a találat-számokkal.
 */
export function CommentRulesEditor({
  config,
  setConfig,
  hits,
}: {
  config: NoraConfig;
  setConfig: (next: (prev: NoraConfig) => NoraConfig) => void;
  /** szabály-azonosító → találatok száma az elmúlt 7 napban */
  hits?: Record<string, number>;
}) {
  const rules = config.commentRules;

  const patch = (i: number, change: Partial<CommentRule>) =>
    setConfig((c) => ({
      ...c,
      commentRules: c.commentRules.map((r, j) => (j === i ? { ...r, ...change } : r)),
    }));

  const remove = (i: number) =>
    setConfig((c) => ({ ...c, commentRules: c.commentRules.filter((_, j) => j !== i) }));

  return (
    <div className="grid gap-5">
      {rules.length === 0 && (
        <Panel>
          <p className="text-[15px] leading-relaxed text-muted">
            Még nincs komment-szabály. Egy szabály megadja, milyen kulcsszóra reagáljon a bot a
            posztjaid alatt, és mit írjon privát üzenetben a kommentelőnek. Amíg nincs szabály, a
            kommentekre nem válaszolunk.
          </p>
        </Panel>
      )}

      {rules.map((rule, i) => {
        const mindenPoszt = !rule.poszt.trim() || rule.poszt.trim() === MINDEN_POSZT;
        const nincsKulcsszo = rule.kulcsszavak.filter((k) => k.trim()).length === 0;

        return (
          <Panel key={rule.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="micro">{i + 1}. szabály</span>
              <div className="flex items-center gap-4">
                {hits ? (
                  <span className="text-[13px] text-micro">
                    {hits[rule.id] ?? 0}× sült el 7 nap alatt
                  </span>
                ) : null}
                <button
                  type="button"
                  className="text-sm font-semibold text-muted hover:text-brick"
                  onClick={() => remove(i)}
                >
                  Törlés
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <Field label="A szabály neve" hint="Csak neked, hogy felismerd a listában.">
                <input
                  className="field"
                  value={rule.nev}
                  onChange={(e) => patch(i, { nev: e.target.value })}
                  placeholder="Ár-érdeklődés"
                />
              </Field>

              <Field
                label="Kulcsszavak"
                hint="Vesszővel elválasztva. Kis- és nagybetű, valamint ékezet nem számít. Részszóra is illeszkedik."
              >
                <input
                  className="field"
                  value={rule.kulcsszavak.join(", ")}
                  onChange={(e) =>
                    patch(i, { kulcsszavak: e.target.value.split(",").map((k) => k.trim()) })
                  }
                  placeholder="ár, mennyi, érdekel"
                />
                {nincsKulcsszo && (
                  <p className="mt-2 text-sm leading-relaxed text-brick">
                    Kulcsszó nélkül ez a szabály soha nem fut le. Adj meg legalább egyet.
                  </p>
                )}
              </Field>

              <div>
                <Toggle
                  checked={mindenPoszt}
                  onChange={(v) => patch(i, { poszt: v ? MINDEN_POSZT : "" })}
                  label="Minden poszt alatt érvényes"
                />
                {!mindenPoszt && (
                  <div className="mt-3">
                    <Field
                      label="Poszt azonosítója"
                      hint="Az Instagram média-azonosítója. Csak ennek a bejegyzésnek a kommentjeire fut le."
                    >
                      <input
                        className="field"
                        value={rule.poszt}
                        onChange={(e) => patch(i, { poszt: e.target.value })}
                        placeholder="17912345678901234"
                      />
                    </Field>
                  </div>
                )}
              </div>

              <Field
                label="Privát üzenet"
                hint="Ezt küldjük DM-ben a kommentelőnek. Ha üresen hagyod, az asszisztens a beállításaid alapján írja meg."
              >
                <textarea
                  className="field min-h-[96px] resize-y"
                  value={rule.privatSzoveg}
                  onChange={(e) => patch(i, { privatSzoveg: e.target.value })}
                  placeholder="Szia! Megírom privátban a részleteket — mi a legnagyobb akadály most nálad?"
                />
              </Field>

              <Field
                label="Nyilvános válaszok a komment alá"
                hint="Több változat közül véletlenül választunk, hogy ne tűnjön gépnek. Ha nincs egy sem, nem írunk nyilvános választ."
              >
                <div className="grid gap-2.5">
                  {rule.nyilvanosValaszok.map((text, k) => (
                    <div key={k} className="flex gap-2.5">
                      <input
                        className="field"
                        value={text}
                        onChange={(e) =>
                          patch(i, {
                            nyilvanosValaszok: rule.nyilvanosValaszok.map((t, j) =>
                              j === k ? e.target.value : t,
                            ),
                          })
                        }
                        placeholder="Megírtam privátban! 💬"
                      />
                      <button
                        type="button"
                        className="pill shrink-0"
                        onClick={() =>
                          patch(i, {
                            nyilvanosValaszok: rule.nyilvanosValaszok.filter((_, j) => j !== k),
                          })
                        }
                      >
                        Törlés
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="pill mt-2.5"
                  onClick={() =>
                    patch(i, { nyilvanosValaszok: [...rule.nyilvanosValaszok, ""] })
                  }
                >
                  + Változat hozzáadása
                </button>
              </Field>

              <div className="border-t border-line pt-4">
                <Toggle
                  checked={rule.be}
                  onChange={(v) => patch(i, { be: v })}
                  label={rule.be ? "Bekapcsolva" : "Kikapcsolva"}
                />
              </div>
            </div>
          </Panel>
        );
      })}

      <button
        type="button"
        className="btn-ghost justify-self-start"
        onClick={() => setConfig((c) => ({ ...c, commentRules: [...c.commentRules, emptyRule()] }))}
      >
        + Új szabály
      </button>
    </div>
  );
}
