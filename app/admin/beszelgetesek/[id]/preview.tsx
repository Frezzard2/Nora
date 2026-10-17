"use client";

import { useState } from "react";
import { replyPreview, type PreviewResult } from "../../actions";

/**
 * „Mit válaszolna most?" — a beszélgetés lefuttatása a jelenlegi beállításokkal.
 *
 * Konfiguráció-módosítás után ezzel lehet valódi beszélgetésen ellenőrizni a
 * változást, mielőtt éles érdeklődőn derülne ki, hogy nem jó.
 */
export default function ProbaValasz({ convId }: { convId: string }) {
  const [eredmeny, setEredmeny] = useState<PreviewResult | null>(null);
  const [fut, setFut] = useState(false);

  async function proba() {
    setFut(true);
    setEredmeny(null);
    setEredmeny(await replyPreview(convId));
    setFut(false);
  }

  return (
    <section className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold">Mit válaszolna most?</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">
            Lefuttatja ezt a beszélgetést a mostani beállításokkal. Hasznos, ha módosítottál a
            gyakori kérdéseken vagy a hangnemen, és látni akarod, változott-e.{" "}
            <strong className="text-ink">Nem megy ki üzenet</strong> — a válasz csak itt jelenik meg.
          </p>
        </div>
        <button type="button" className="btn-ghost shrink-0" onClick={proba} disabled={fut}>
          {fut ? "Gondolkodik…" : "Próba"}
        </button>
      </div>

      {eredmeny && !eredmeny.ok && (
        <p className="mt-4 rounded-[10px] border border-brick/30 bg-brick-soft px-4 py-3 text-[15px] leading-relaxed text-brick">
          {eredmeny.error}
        </p>
      )}

      {eredmeny?.ok && (
        <div className="mt-4">
          {eredmeny.kerdes && (
            <p className="text-[13px] text-micro">
              Erre válaszolna: <span className="text-muted">„{eredmeny.kerdes}"</span>
            </p>
          )}
          <div className="mt-2 whitespace-pre-wrap rounded-[14px] border border-dashed border-green-line bg-green-soft px-4 py-3 text-[15px] leading-relaxed text-ink">
            {eredmeny.valasz || "(üres válasz)"}
          </div>
          <p className="mt-2 text-[13px] text-micro">
            {eredmeny.atadas
              ? "Ezt átadásnak jelölné — a bot elhallgatna, és rád várna."
              : "Próba — ez az üzenet nem ment ki senkinek."}
          </p>
        </div>
      )}
    </section>
  );
}
