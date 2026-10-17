"use client";

import { Field, Toggle } from "@/components/form";
import { Panel } from "@/components/config-sections";
import { UTANKOVETES_MAX_ORA, type NoraConfig } from "@/lib/types";

/**
 * Utánkövetés beállítása. Alapból kikapcsolva — kéretlen üzenetet küldeni
 * más nevében csak szándékosan szabad.
 */
export function UtankovetesEditor({
  config,
  setConfig,
}: {
  config: NoraConfig;
  setConfig: (next: (prev: NoraConfig) => NoraConfig) => void;
}) {
  const u = config.utankovetes;
  const set = (patch: Partial<NoraConfig["utankovetes"]>) =>
    setConfig((c) => ({ ...c, utankovetes: { ...c.utankovetes, ...patch } }));

  return (
    <Panel>
      <Toggle
        checked={u.be}
        onChange={(v) => set({ be: v })}
        label={u.be ? "Bekapcsolva" : "Kikapcsolva"}
      />

      {u.be && (
        <div className="mt-5 grid gap-5 border-t border-line pt-5">
          <Field
            label="Mennyi csend után írjon?"
            hint={`Az érdeklődő utolsó üzenetétől legfeljebb ${UTANKOVETES_MAX_ORA} óra telhet el — az Instagram ennél tovább nem enged automata üzenetet.`}
          >
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={UTANKOVETES_MAX_ORA}
                className="field w-[110px]"
                value={u.orak}
                onChange={(e) => set({ orak: Number(e.target.value) })}
              />
              <span className="text-[15px] text-muted">óra</span>
            </div>
          </Field>

          <Field label="Hány emlékeztetőt küldjön összesen?" hint="Beszélgetésenként, legfeljebb kettőt.">
            <div className="flex gap-2.5">
              {[1, 2].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set({ maxDb: n })}
                  className={u.maxDb === n ? "pill-on" : "pill"}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Az emlékeztető szövege"
            hint="A te hangodon írd. Üresen hagyva semmi nem megy ki."
          >
            <textarea
              className="field min-h-[90px] resize-y"
              value={u.szoveg}
              onChange={(e) => set({ szoveg: e.target.value })}
              placeholder="Szia! Jelentkezem még egyszer — sikerült időpontot találnod? Ha bármi kérdés maradt, írj nyugodtan."
            />
            {!u.szoveg.trim() && (
              <p className="mt-2 text-sm leading-relaxed text-brick">
                Szöveg nélkül nem megy ki emlékeztető.
              </p>
            )}
          </Field>

          <p className="rounded-[10px] border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-muted">
            <strong className="text-ink">Mikor NEM ír:</strong> ha a beszélgetést átadtátok embernek,
            ha a bot ki van kapcsolva rajta, ha valaki kézzel válaszolt, ha az érdeklődőn van a sor,
            vagy ha már kicsúsztunk az Instagram 24 órás ablakából.
          </p>
        </div>
      )}
    </Panel>
  );
}
