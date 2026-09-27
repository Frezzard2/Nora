"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import { CheckRow, Choice, Field, Toggle } from "@/components/form";
import { Check } from "@/components/icons";
import { BRAND } from "@/lib/brand";
import { exportConfig, loadConfig, mergeConfig, saveConfig } from "@/lib/storage";
import { ATADAS_ALAP, emptyConfig, type NoraConfig } from "@/lib/types";

const SECTIONS = [
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
];

const FORRASOK = [
  "Instagram story válaszok",
  "Reels / TikTok kommentek",
  "Fizetett hirdetés",
  "Weboldal chat",
  "Ajánlás, ismerős",
  "E-mail lista",
];

export default function Onboarding() {
  const [config, setConfig] = useState<NoraConfig>(emptyConfig);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = loadConfig();
    if (saved) setConfig(mergeConfig(saved));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveConfig(config);
  }, [config, ready]);

  const set = <K extends keyof NoraConfig>(key: K, patch: Partial<NoraConfig[K]>) =>
    setConfig((c) => ({ ...c, [key]: { ...c[key], ...patch } }));

  const done = step >= SECTIONS.length;
  const current = Math.min(step, SECTIONS.length - 1);
  const progress = Math.round((Math.min(step, SECTIONS.length) / SECTIONS.length) * 100);

  const goto = (i: number) => {
    setStep(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar>
        <span className="text-sm text-muted">
          {done ? "Kész" : `${step + 1}. lépés a ${SECTIONS.length}-ből`}
        </span>
        <div className="h-1.5 w-[120px] overflow-hidden rounded-full bg-line sm:w-[180px]">
          <div
            className="h-full rounded-full bg-green transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </TopBar>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Szekciólista */}
        <nav className="border-b border-line bg-card lg:w-[296px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex gap-2 overflow-x-auto px-4 py-4 lg:flex-col lg:gap-1 lg:px-5 lg:py-7">
            <span className="micro hidden px-3 pb-3 lg:block">Szekciók</span>
            {SECTIONS.map((s, i) => {
              const isDone = i < step;
              const isActive = !done && i === current;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => goto(i)}
                  className={`flex shrink-0 items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition lg:w-full ${
                    isActive
                      ? "border border-green-line bg-green-soft"
                      : "border border-transparent hover:bg-paper"
                  }`}
                >
                  {isDone ? (
                    <Check className="shrink-0 text-green" />
                  ) : (
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                        isActive
                          ? "bg-green font-semibold text-white"
                          : "border-[1.5px] border-line-strong text-micro"
                      }`}
                    >
                      {i + 1}
                    </span>
                  )}
                  <span
                    className={`whitespace-nowrap text-[15px] ${
                      isActive ? "font-semibold text-ink" : isDone ? "text-muted" : "text-micro"
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
              );
            })}

            <div className="hidden flex-1 lg:block" />
            <div className="hidden rounded-xl border border-line bg-paper p-3.5 lg:block">
              <p className="text-[13px] font-semibold">Mentve</p>
              <p className="mt-1 text-[13px] leading-snug text-muted">
                A válaszaid automatikusan megmaradnak, bármikor folytathatod.
              </p>
            </div>
          </div>
        </nav>

        {/* Tartalom */}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-14 lg:py-10">
          <div className="mx-auto max-w-[760px]">
            <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">
              {done ? "Kész a konfiguráció" : SECTIONS[current].title}
            </h1>
            <p className="mt-2 max-w-[640px] text-base leading-relaxed text-muted">
              {done
                ? "Ez épül be az asszisztens rendszerpromptjába. Nézd át, aztán próbáld ki élesben."
                : SECTIONS[current].lead}
            </p>

            <div className="mt-7 grid gap-5">
              {!done && step === 0 && (
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
              )}

              {!done && step === 1 && (
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
              )}

              {!done && step === 2 && (
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
              )}

              {!done && step === 3 && (
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
              )}

              {!done && step === 4 && (
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
              )}

              {!done && step === 5 && (
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
              )}

              {!done && step === 6 && (
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
              )}

              {done && <Summary config={config} />}
            </div>

            {/* Navigáció */}
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
              <button
                type="button"
                className="btn-ghost"
                disabled={step === 0}
                onClick={() => goto(step - 1)}
              >
                Vissza
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button type="button" className="btn-quiet" onClick={() => exportConfig(config)}>
                  Export JSON
                </button>
                <button type="button" className="btn-quiet" onClick={() => fileRef.current?.click()}>
                  Import JSON
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setConfig(mergeConfig(JSON.parse(await file.text())));
                    } catch {
                      alert("Nem sikerült beolvasni a fájlt — érvényes JSON kell.");
                    }
                    e.target.value = "";
                  }}
                />
                {!done ? (
                  <button type="button" className="btn-primary" onClick={() => goto(step + 1)}>
                    {step === SECTIONS.length - 1 ? "Konfiguráció létrehozása" : "Tovább"}
                  </button>
                ) : (
                  <Link href="/simulator" className="btn-primary">
                    Tovább a szimulátorra
                  </Link>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="card p-5 sm:p-[22px]">{children}</div>;
}

function Summary({ config }: { config: NoraConfig }) {
  const rows: [string, string][] = [
    ["Név / márka", [config.alapok.nev, config.alapok.markanev].filter(Boolean).join(" · ") || "—"],
    ["Pozicionálás", config.alapok.kinekMibenSegit || "—"],
    ["Fő szolgáltatás", config.ajanlat.foSzolgaltatas || "—"],
    [
      "Ár",
      config.ajanlat.ar
        ? `${config.ajanlat.ar} (${config.ajanlat.arElarulhato ? "elárulható" : "csak híváson"})`
        : "—",
    ],
    ["Cél", `${config.ajanlat.cel} → ${config.ajanlat.celLink || "nincs link"}`],
    ["Kvalifikáló kérdések", `${config.kvalifikacio.kerdesek.filter((q) => q.trim()).length} db`],
    [
      "Hangnem",
      `${config.hangnem.megszolitas} · ${config.hangnem.valaszHossz} válaszok · emoji: ${config.hangnem.emoji}`,
    ],
    [
      "DM-minták",
      config.hangnem.dmPeldak.trim()
        ? `${config.hangnem.dmPeldak.trim().split("\n").filter(Boolean).length} sor`
        : "nincs megadva",
    ],
    ["Gyakori kérdések", `${config.gyik.filter((f) => f.q.trim() && f.a.trim()).length} pár`],
    ["Átadás embernek", config.hatarok.atadasEsetei.join(", ") || "—"],
    ["Indítók", config.inditok.forrasok.join(", ") || "—"],
  ];

  return (
    <div className="card p-5 sm:p-[22px]">
      <dl className="divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-3.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
            <dt className="text-sm font-semibold text-micro">{k}</dt>
            <dd className="text-[15px] leading-relaxed">{v}</dd>
          </div>
        ))}
      </dl>

      <details className="mt-5 border-t border-line pt-5">
        <summary className="cursor-pointer text-sm font-semibold text-green">
          Nyers JSON megtekintése
        </summary>
        <pre className="mt-3 max-h-[380px] overflow-auto rounded-[10px] border border-line bg-input p-4 text-[13px] leading-relaxed">
          {JSON.stringify(config, null, 2)}
        </pre>
        <p className="mt-3 text-[13px] text-micro">
          Tároló kulcs: <code className="text-ink">{BRAND.storageKey}</code>
        </p>
      </details>
    </div>
  );
}
