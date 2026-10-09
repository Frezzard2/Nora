"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CommentRulesEditor } from "@/components/comment-rules";
import type { NoraConfig } from "@/lib/types";
import { saveClientConfig } from "../actions";

type Note = { kind: "info" | "warn"; text: string };

export default function RulesForm({
  initial,
  hits,
  configIncomplete,
}: {
  initial: NoraConfig;
  hits: Record<string, number>;
  configIncomplete: boolean;
}) {
  const [config, setConfig] = useState<NoraConfig>(initial);
  const [note, setNote] = useState<Note | null>(null);
  const [pending, start] = useTransition();

  const aiFüggő = config.commentRules.some((r) => r.be && !r.privatSzoveg.trim());

  function save() {
    setNote(null);
    start(async () => {
      const result = await saveClientConfig(config);
      setNote(
        result.ok
          ? { kind: "info", text: "Mentve. A következő kommentnél már ezek a szabályok futnak." }
          : { kind: "warn", text: result.error ?? "A mentés most nem sikerült. Próbáld újra." },
      );
    });
  }

  return (
    <main className="mx-auto max-w-[780px] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">Komment-szabályok</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Ha valaki a posztod alá olyan kommentet ír, ami illeszkedik egy bekapcsolt szabályra, a bot
        privát üzenetet küld neki — és ha megadsz nyilvános választ, azt is kiírja a komment alá.
        Illeszkedő szabály nélkül nem történik semmi.
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Egy kommentre az Instagram csak <strong className="text-ink">egy</strong> privát üzenetet
        engedélyez, és csak a komment megjelenése utáni 7 napon belül.
      </p>

      {configIncomplete && aiFüggő && (
        <p className="mt-5 rounded-[10px] border border-brick/30 bg-brick-soft px-4 py-3.5 text-[15px] leading-relaxed text-brick">
          Van olyan szabály, aminél az asszisztens írja meg a privát üzenetet, de a{" "}
          <Link href="/admin/beallitasok" className="font-semibold underline">
            beállítások
          </Link>{" "}
          még nincsenek kitöltve. Addig ezekre a kommentekre nem megy ki privát üzenet — vagy töltsd
          ki a beállításokat, vagy írj a szabályhoz kész szöveget.
        </p>
      )}

      <div className="mt-8">
        <CommentRulesEditor config={config} setConfig={setConfig} hits={hits} />
      </div>

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
        <button type="button" className="btn-primary" onClick={save} disabled={pending}>
          {pending ? "Mentés…" : "Mentés"}
        </button>
      </div>
    </main>
  );
}
