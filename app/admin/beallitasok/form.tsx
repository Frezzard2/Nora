"use client";

import { useState, useTransition } from "react";
import { ConfigSection, SECTIONS } from "@/components/config-sections";
import { CommentRulesEditor } from "@/components/comment-rules";
import { UtankovetesEditor } from "@/components/followup";
import { configGaps, gapSentence } from "@/lib/readiness";
import type { NoraConfig } from "@/lib/types";
import { saveClientConfig } from "../actions";

type Note = { kind: "info" | "warn"; text: string };

export default function SettingsForm({ initial }: { initial: NoraConfig }) {
  const [config, setConfig] = useState<NoraConfig>(initial);
  const [note, setNote] = useState<Note | null>(null);
  const [pending, start] = useTransition();

  const gaps = configGaps(config);

  function save() {
    // validáció MENTÉS ELŐTT: kitöltetlen kötelező mezővel a bot nem válaszolna
    if (gaps.length) {
      setNote({ kind: "warn", text: `Mentés előtt töltsd ki ezeket: ${gapSentence(gaps)}.` });
      return;
    }

    setNote(null);
    start(async () => {
      const result = await saveClientConfig(config);
      setNote(
        result.ok
          ? { kind: "info", text: "Mentve. A következő üzenetnél már ezekkel a beállításokkal válaszol." }
          : { kind: "warn", text: result.error ?? "A mentés most nem sikerült. Próbáld újra." },
      );
    });
  }

  return (
    <main className="mx-auto max-w-[780px] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">Beállítások</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Ebből tanulja meg az asszisztens, mit és hogyan válaszoljon. A mentés azonnal érvényes — a
        következő üzenet már az új beállításokkal megy ki.
      </p>

      {SECTIONS.map((section, i) => (
        <section key={section.title} className="mt-10">
          <h2 className="text-[20px] font-bold">{section.title}</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{section.lead}</p>
          <div className="mt-5 grid gap-5">
            <ConfigSection index={i} config={config} setConfig={setConfig} />
          </div>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="text-[20px] font-bold">Komment-szabályok</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
          Mire reagáljon a bot a posztjaid kommentjeiben. A találat-statisztikát a
          Komment-szabályok oldalon találod.
        </p>
        <div className="mt-5">
          <CommentRulesEditor config={config} setConfig={setConfig} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-bold">Utánkövetés</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
          Ha az érdeklődő elhallgat azután, hogy a bot válaszolt neki, küldhetünk egy udvarias
          emlékeztetőt. Alapból ki van kapcsolva.
        </p>
        <div className="mt-5">
          <UtankovetesEditor config={config} setConfig={setConfig} />
        </div>
      </section>

      {/* Mobilon is elérhető mentés: a sáv a képernyő alján marad. */}
      <div className="sticky bottom-0 -mx-4 mt-10 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        {note && (
          <p
            role="status"
            className={`mb-3 rounded-[10px] border px-4 py-3 text-[15px] leading-relaxed ${
              note.kind === "warn"
                ? "border-brick/30 bg-brick-soft text-brick"
                : "border-green-line bg-green-soft text-green-dark"
            }`}
          >
            {note.text}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={save} disabled={pending}>
            {pending ? "Mentés…" : "Mentés"}
          </button>
          {gaps.length > 0 && (
            <span className="text-[15px] text-muted">Hiányzik még: {gapSentence(gaps)}</span>
          )}
        </div>
      </div>
    </main>
  );
}
