"use client";

import type { ReactNode } from "react";
import { CheckRow, Choice, Field, Toggle } from "@/components/form";
import { ATADAS_ALAP, type NoraConfig } from "@/lib/types";

/**
 * A kérdőív szekciói — EGY helyen, mert két felület használja: az /onboarding
 * varázsló lépésenként, az /admin/beallitasok pedig egymás alatt, mindet.
 */
export const SECTIONS = [
  {
    title: "Alapok",
    lead: "Kezdjük azzal, ki vagy és kinek segítesz. Ez lesz minden beszélgetés kiindulópontja.",
  },
  {
    title: "Ajánlat",
    lead: "Mit kínálsz, mennyiért, és mi az, amit egy jó beszélgetés végén el akarsz érni.",
  },
  {
    title: "Kvalifikáció",
    lead: "Kivel akarsz dolgozni. Az asszisztens ezeket természetesen szövi bele, nem kérdőívként.",
  },
  {
    title: "Hangnem",
    lead: "Ettől fog úgy hangzani az asszisztens, mint te. Minél több valódi példát adsz, annál pontosabb.",
  },
  {
    title: "Gyakori kérdések",
    lead: "Amit százszor megkérdeznek. Ezekre szó szerint a te válaszodat adja.",
  },
  {
    title: "Határok és átadás",
    lead: "Hol áll meg az asszisztens, és mikor szólsz bele te személyesen.",
  },
  {
    title: "Indítók",
    lead: "Honnan érkeznek a beszélgetések, és mi a mostani kampányod kulcsszava.",
  },
] as const;

export const FORRASOK = [
  "Instagram story válaszok",
  "Reels / TikTok kommentek",
  "Fizetett hirdetés",
  "Weboldal chat",
  "Ajánlás, ismerős",
  "E-mail lista",
];

export function Panel({ children }: { children: ReactNode }) {
  return <div className="card p-5 sm:p-[22px]">{children}</div>;
}

export type SectionProps = {
  config: NoraConfig;
  setConfig: (next: (prev: NoraConfig) => NoraConfig) => void;
};

/** Egy szekció mezői. Az index a SECTIONS sorrendjét követi. */
export function ConfigSection({ index, config, setConfig }: SectionProps & { index: number }) {
  const set = <K extends keyof NoraConfig>(key: K, patch: Partial<NoraConfig[K]>) =>
    setConfig((c) => ({ ...c, [key]: { ...c[key], ...patch } }));

  switch (index) {
    case 0:
      return (
        <>
          <Panel>
            <Field label="A neved">
              <input
                className="field"
                value={config.alapok.nev}
                onChange={(e) => set("alapok", { nev: e.target.value })}
                placeholder="Kiss Anna"
              />
            </Field>
          </Panel>
          <Panel>
            <Field label="Márkanév" hint="Ahogy a közösségi médiában szerepelsz.">
              <input
                className="field"
                value={config.alapok.markanev}
                onChange={(e) => set("alapok", { markanev: e.target.value })}
                placeholder="Anna Coaching"
              />
            </Field>
          </Panel>
          <Panel>
            <Field label="Egy mondatban: kinek miben segítesz?">
              <textarea
                className="field min-h-[96px] resize-y"
                value={config.alapok.kinekMibenSegit}
                onChange={(e) => set("alapok", { kinekMibenSegit: e.target.value })}
                placeholder="Harmincas nőknek segítek visszaszerezni az energiájukat táplálkozási coachinggal."
              />
            </Field>
          </Panel>
          <Panel>
            <Field label="Nyelv">
              <Choice
                value={config.alapok.nyelv}
                onChange={(v) => set("alapok", { nyelv: v })}
                options={[
                  { value: "magyar", label: "Magyar" },
                  { value: "angol", label: "Angol" },
                ]}
              />
            </Field>
          </Panel>
        </>
      );

    case 1:
      return (
        <>
          <Panel>
            <Field label="Fő szolgáltatás">
              <input
                className="field"
                value={config.ajanlat.foSzolgaltatas}
                onChange={(e) => set("ajanlat", { foSzolgaltatas: e.target.value })}
                placeholder="12 hetes 1:1 táplálkozási program"
              />
            </Field>
          </Panel>
          <Panel>
            <Field label="Ár">
              <input
                className="field"
                value={config.ajanlat.ar}
                onChange={(e) => set("ajanlat", { ar: e.target.value })}
                placeholder="240 000 Ft / 12 hét"
              />
            </Field>
            <div className="mt-4 border-t border-line pt-4">
              <Toggle
                checked={config.ajanlat.arElarulhato}
                onChange={(v) => set("ajanlat", { arElarulhato: v })}
                label="Az árat elárulhatja üzenetben"
              />
            </div>
          </Panel>
          <div className="grid gap-5 sm:grid-cols-2">
            <Panel>
              <Field label="A beszélgetés célja">
                <Choice
                  value={config.ajanlat.cel}
                  onChange={(v) => set("ajanlat", { cel: v })}
                  options={[
                    { value: "hivas", label: "Hívásfoglalás" },
                    { value: "termeklink", label: "Terméklink" },
                    { value: "email", label: "E-mail cím" },
                  ]}
                />
              </Field>
            </Panel>
            <Panel>
              <Field label="Cél-link" hint="Ide tereli a kvalifikált érdeklődőket.">
                <input
                  className="field"
                  value={config.ajanlat.celLink}
                  onChange={(e) => set("ajanlat", { celLink: e.target.value })}
                  placeholder="https://calendly.com/anna/konzultacio"
                />
              </Field>
            </Panel>
          </div>
        </>
      );

    case 2:
      return (
        <>
          <Panel>
            <Field label="Kvalifikáló kérdések" hint="2-4 kérdés.">
              <div className="grid gap-2.5">
                {config.kvalifikacio.kerdesek.map((q, i) => (
                  <div key={i} className="flex gap-2.5">
                    <input
                      className="field"
                      value={q}
                      onChange={(e) => {
                        const kerdesek = [...config.kvalifikacio.kerdesek];
                        kerdesek[i] = e.target.value;
                        set("kvalifikacio", { kerdesek });
                      }}
                      placeholder="Mióta foglalkoztat ez a téma?"
                    />
                    {config.kvalifikacio.kerdesek.length > 2 && (
                      <button
                        type="button"
                        className="pill shrink-0"
                        onClick={() =>
                          set("kvalifikacio", {
                            kerdesek: config.kvalifikacio.kerdesek.filter((_, j) => j !== i),
                          })
                        }
                      >
                        Törlés
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {config.kvalifikacio.kerdesek.length < 4 && (
                <button
                  type="button"
                  className="pill mt-2.5"
                  onClick={() =>
                    set("kvalifikacio", { kerdesek: [...config.kvalifikacio.kerdesek, ""] })
                  }
                >
                  + Kérdés hozzáadása
                </button>
              )}
            </Field>
          </Panel>
          <Panel>
            <Field label="A „rossz ügyfél” jelei">
              <textarea
                className="field min-h-[90px] resize-y"
                value={config.kvalifikacio.rosszUgyfelJelei}
                onChange={(e) => set("kvalifikacio", { rosszUgyfelJelei: e.target.value })}
                placeholder="Csak gyors megoldást keres, nem akar változtatni, azonnal alkudozik."
              />
            </Field>
          </Panel>
          <Panel>
            <Field label="Minimum feltételek">
              <textarea
                className="field min-h-[80px] resize-y"
                value={config.kvalifikacio.minimumFeltetelek}
                onChange={(e) => set("kvalifikacio", { minimumFeltetelek: e.target.value })}
                placeholder="Heti 3 óra ráfordítás, 18 év felett, magyarul beszél."
              />
            </Field>
          </Panel>
        </>
      );

    case 3:
      return (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Panel>
              <Field label="Megszólítás">
                <Choice
                  value={config.hangnem.megszolitas}
                  onChange={(v) => set("hangnem", { megszolitas: v })}
                  options={[
                    { value: "tegezodes", label: "Tegeződés" },
                    { value: "magazodas", label: "Magázódás" },
                  ]}
                />
              </Field>
            </Panel>
            <Panel>
              <Field label="Válaszhossz">
                <Choice
                  value={config.hangnem.valaszHossz}
                  onChange={(v) => set("hangnem", { valaszHossz: v })}
                  options={[
                    { value: "rovid", label: "Rövid" },
                    { value: "kozepes", label: "Közepes" },
                    { value: "reszletes", label: "Hosszú" },
                  ]}
                />
              </Field>
            </Panel>
          </div>
          <Panel>
            <Field label="Emoji-használat">
              <Choice
                value={config.hangnem.emoji}
                onChange={(v) => set("hangnem", { emoji: v })}
                options={[
                  { value: "nincs", label: "Nincs" },
                  { value: "ritkan", label: "Ritkán" },
                  { value: "gyakran", label: "Gyakran" },
                ]}
              />
            </Field>
          </Panel>

          {/* A legfontosabb mező */}
          <div className="rounded-[14px] border-[1.5px] border-green bg-card p-5 sm:p-[22px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="dm" className="text-[15px] font-semibold">
                Valódi DM-váltások
              </label>
              <span className="tag">A legfontosabb mező</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Másolj be 2-3 beszélgetést, amire büszke vagy. Ezekből tanulja meg az
              asszisztens a stílusodat: a szóhasználatot, a ritmust, azt, hogyan terelsz a
              foglalás felé.
            </p>
            <textarea
              id="dm"
              className="field mt-3.5 min-h-[220px] resize-y"
              value={config.hangnem.dmPeldak}
              onChange={(e) => set("hangnem", { dmPeldak: e.target.value })}
              placeholder={
                "Érdeklődő: Szia! Mennyibe kerül a program?\n" +
                "Te: Szia! Örülök, hogy írtál. Mielőtt árat mondok: most mi a legnagyobb akadály nálad?\n" +
                "Érdeklődő: Állandóan fáradt vagyok, este meg bezabálok.\n" +
                "Te: Ismerős. Ezt szoktuk elsőként rendbe tenni. Mióta megy ez így?"
              }
            />
          </div>

          <Panel>
            <Field label="Tipikus fordulataid">
              <textarea
                className="field min-h-[80px] resize-y"
                value={config.hangnem.tipikusFordulatok}
                onChange={(e) => set("hangnem", { tipikusFordulatok: e.target.value })}
                placeholder="„Ismerős.”, „Örülök, hogy írtál.”, „Nézzük meg együtt.”"
              />
            </Field>
          </Panel>
          <Panel>
            <Field label="Amit sosem használnál">
              <textarea
                className="field min-h-[80px] resize-y"
                value={config.hangnem.tiltottSzavak}
                onChange={(e) => set("hangnem", { tiltottSzavak: e.target.value })}
                placeholder="pl. „garantált eredmény”, túl sok felkiáltójel, nagybetűs kiabálás"
              />
            </Field>
          </Panel>
        </>
      );

    case 4:
      return (
        <>
          {config.gyik.map((item, i) => (
            <Panel key={i}>
              <div className="mb-3 flex items-center justify-between">
                <span className="micro">Kérdés {i + 1}</span>
                {config.gyik.length > 1 && (
                  <button
                    type="button"
                    className="text-sm font-semibold text-muted hover:text-brick"
                    onClick={() =>
                      setConfig((c) => ({ ...c, gyik: c.gyik.filter((_, j) => j !== i) }))
                    }
                  >
                    Törlés
                  </button>
                )}
              </div>
              <input
                className="field"
                value={item.q}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    gyik: c.gyik.map((g, j) => (j === i ? { ...g, q: e.target.value } : g)),
                  }))
                }
                placeholder="Kérdés — pl. Mennyi időt vesz el hetente?"
              />
              <textarea
                className="field mt-2.5 min-h-[80px] resize-y"
                value={item.a}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    gyik: c.gyik.map((g, j) => (j === i ? { ...g, a: e.target.value } : g)),
                  }))
                }
                placeholder="Válasz a te szavaiddal."
              />
            </Panel>
          ))}
          {config.gyik.length < 15 && (
            <button
              type="button"
              className="pill self-start"
              onClick={() => setConfig((c) => ({ ...c, gyik: [...c.gyik, { q: "", a: "" }] }))}
            >
              + Kérdés-válasz pár ({config.gyik.length}/15)
            </button>
          )}
        </>
      );

    case 5:
      return (
        <>
          <Panel>
            <Field
              label="Azonnali átadás esetei"
              hint="Ezekben az esetekben az asszisztens megáll, és jelzi, hogy te válaszolsz személyesen."
            >
              <div className="grid gap-2.5">
                {ATADAS_ALAP.map((label) => (
                  <CheckRow
                    key={label}
                    label={label}
                    checked={config.hatarok.atadasEsetei.includes(label)}
                    onChange={(v) =>
                      set("hatarok", {
                        atadasEsetei: v
                          ? [...config.hatarok.atadasEsetei, label]
                          : config.hatarok.atadasEsetei.filter((x) => x !== label),
                      })
                    }
                  />
                ))}
                {config.hatarok.atadasEsetei
                  .filter((x) => !ATADAS_ALAP.includes(x))
                  .map((label) => (
                    <CheckRow
                      key={label}
                      label={label}
                      checked
                      onChange={() => {}}
                      onRemove={() =>
                        set("hatarok", {
                          atadasEsetei: config.hatarok.atadasEsetei.filter(
                            (x) => x !== label,
                          ),
                        })
                      }
                    />
                  ))}
              </div>
              <form
                className="mt-2.5 flex gap-2.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements.namedItem("uj") as HTMLInputElement;
                  const v = input.value.trim();
                  if (v && !config.hatarok.atadasEsetei.includes(v)) {
                    set("hatarok", { atadasEsetei: [...config.hatarok.atadasEsetei, v] });
                  }
                  input.value = "";
                }}
              >
                <input className="field" name="uj" placeholder="Saját eset hozzáadása" />
                <button type="submit" className="pill shrink-0">
                  Hozzáad
                </button>
              </form>
            </Field>
          </Panel>
          <Panel>
            <Field label="Amit soha nem mondhat">
              <textarea
                className="field min-h-[90px] resize-y"
                value={config.hatarok.sohaNeMondja}
                onChange={(e) => set("hatarok", { sohaNeMondja: e.target.value })}
                placeholder="Nem ígér gyógyulást, nem ad orvosi tanácsot, nem beszél más ügyfelekről."
              />
            </Field>
          </Panel>
          <Panel>
            <Field label="Fallback mondat, ha nem tudja a választ">
              <input
                className="field"
                value={config.hatarok.fallbackMondat}
                onChange={(e) => set("hatarok", { fallbackMondat: e.target.value })}
                placeholder="Ezt inkább megkérdezem Annától, és visszajelzek rá."
              />
            </Field>
          </Panel>
        </>
      );

    case 6:
      return (
        <>
          <Panel>
            <Field label="Honnan jönnek a beszélgetések?">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {FORRASOK.map((f) => (
                  <CheckRow
                    key={f}
                    label={f}
                    checked={config.inditok.forrasok.includes(f)}
                    onChange={(v) =>
                      set("inditok", {
                        forrasok: v
                          ? [...config.inditok.forrasok, f]
                          : config.inditok.forrasok.filter((x) => x !== f),
                      })
                    }
                  />
                ))}
              </div>
            </Field>
          </Panel>
          <Panel>
            <Field
              label="Aktuális kampány-kulcsszó"
              hint="Amit a storyban kérsz, hogy írjanak be — így tudni fogja, honnan jött az érdeklődő."
            >
              <input
                className="field"
                value={config.inditok.kampanyKulcsszo}
                onChange={(e) => set("inditok", { kampanyKulcsszo: e.target.value })}
                placeholder="ENERGIA"
              />
            </Field>
          </Panel>
        </>
      );
    default:
      return null;
  }
}
