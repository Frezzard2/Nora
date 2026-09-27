import Link from "next/link";
import TopBar from "@/components/TopBar";
import { BRAND } from "@/lib/brand";

const steps = [
  {
    n: "1",
    title: "Beállítás",
    text: "Hét rövid szekció: ki vagy, mit kínálsz, hogyan írsz, hol a határ. A végén kész JSON konfiguráció.",
  },
  {
    n: "2",
    title: "Szimulátor",
    text: "Írj érdeklődőként, és nézd meg, hogyan válaszol az asszisztens — Instagramon, Messengeren, WhatsAppon.",
  },
  {
    n: "3",
    title: "Átadás embernek",
    text: "Panasz, ár-alku, érzékeny téma esetén az asszisztens megáll, és jelzi, hogy te válaszolsz személyesen.",
  },
];

export default function Home() {
  return (
    <>
      <TopBar tag="Demó">
        <Link href="/simulator" className="btn-quiet">
          Szimulátor
        </Link>
        <Link href="/onboarding" className="btn-primary">
          Beállítás
        </Link>
      </TopBar>

      <main className="mx-auto max-w-[1100px] px-4 py-14 sm:px-8 sm:py-24">
        <h1 className="max-w-[760px] text-[38px] font-bold leading-[1.08] sm:text-[56px]">
          {BRAND.name} — üzenet-asszisztens, aki úgy ír, ahogy te.
        </h1>
        <p className="mt-6 max-w-[560px] text-lg leading-relaxed text-muted">
          Beállítod egyszer a hangnemedet, az ajánlatodat és a határaidat. Utána a DM-ekre az
          asszisztens válaszol — és átadja neked a beszélgetést, amikor kell.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/onboarding" className="btn-primary">
            Beállítás indítása
          </Link>
          <Link href="/simulator" className="btn-ghost">
            Ugrás a szimulátorra
          </Link>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="card p-[22px]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-soft text-[13px] font-semibold text-green-dark">
                {s.n}
              </span>
              <h2 className="mt-4 text-lg font-bold">{s.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
