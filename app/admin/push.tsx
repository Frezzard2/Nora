"use client";

import { useEffect, useState } from "react";
import { sendPushTest, subscribeToPush, unsubscribeFromPush } from "./actions";

/**
 * Értesítés bekapcsolása a telefonon.
 *
 * Egyszeri beállítás: a böngésző engedélyt kér, és onnantól a felület úgy szól,
 * mint egy alkalmazás. iPhone-on előbb a kezdőképernyőre kell tenni az oldalt —
 * enélkül az Apple nem enged push értesítést (iOS 16.4+).
 */

/** A VAPID kulcs base64url alakból a böngészőnek kellő bájttömbbé. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  // a puffert kifejezetten ArrayBuffer-ként hozzuk létre: a pushManager
  // típusa nem fogadja el a SharedArrayBuffer-t is megengedő általános alakot
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Allapot = "betolt" | "nem-tamogatott" | "ki" | "be" | "tiltva";

export default function PushBeallitas({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [allapot, setAllapot] = useState<Allapot>("betolt");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [uzenet, setUzenet] = useState<string | null>(null);
  const [dolgozik, setDolgozik] = useState(false);
  const [iosKezdokepernyo, setIosKezdokepernyo] = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const kitett = window.matchMedia("(display-mode: standalone)").matches;
    setIosKezdokepernyo(ios && !kitett);

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setAllapot("nem-tamogatott");
      return;
    }
    if (Notification.permission === "denied") {
      setAllapot("tiltva");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setEndpoint(sub?.endpoint ?? null);
        setAllapot(sub ? "be" : "ki");
      })
      .catch(() => setAllapot("nem-tamogatott"));
  }, []);

  async function bekapcsol() {
    setDolgozik(true);
    setUzenet(null);
    try {
      const engedely = await Notification.requestPermission();
      if (engedely !== "granted") {
        setAllapot(engedely === "denied" ? "tiltva" : "ki");
        setUzenet("Az értesítéshez engedély kell a böngészőben.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const eredmeny = await subscribeToPush(JSON.parse(JSON.stringify(sub)));
      if (!eredmeny.ok) {
        setUzenet(eredmeny.error ?? "Nem sikerült bekapcsolni.");
        return;
      }
      setEndpoint(sub.endpoint);
      setAllapot("be");
      setUzenet("Bekapcsolva. Küldj magadnak egy próbát, hogy lásd, megérkezik-e.");
    } catch {
      setUzenet("Nem sikerült bekapcsolni az értesítést ezen az eszközön.");
    } finally {
      setDolgozik(false);
    }
  }

  async function kikapcsol() {
    setDolgozik(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      await sub?.unsubscribe();
      if (endpoint) await unsubscribeFromPush(endpoint);
      setEndpoint(null);
      setAllapot("ki");
      setUzenet("Kikapcsolva ezen az eszközön.");
    } finally {
      setDolgozik(false);
    }
  }

  async function proba() {
    setDolgozik(true);
    const r = await sendPushTest();
    setUzenet(r.uzenet);
    setDolgozik(false);
  }

  if (allapot === "betolt") return null;

  return (
    <section className="mt-10">
      <h2 className="text-[20px] font-bold">Értesítés a telefonodra</h2>
      <p className="mt-1.5 max-w-[640px] text-[15px] leading-relaxed text-muted">
        Akkor szól, amikor tényleg rád van szükség: ha a bot átadja a beszélgetést, vagy ha valaki
        olyan szálra ír, ahol a bot már hallgat. A szokásos Instagram-értesítés ilyenkor félrevezet,
        mert a beszélgetés a bot korábbi válaszától megválaszoltnak látszik.
      </p>

      <div className="card mt-4 p-5">
        {allapot === "nem-tamogatott" && (
          <p className="text-[15px] leading-relaxed text-muted">
            Ez a böngésző nem tud értesítést küldeni. Próbáld meg a telefonodon Chrome-mal vagy
            Safarival.
          </p>
        )}

        {allapot === "tiltva" && (
          <p className="text-[15px] leading-relaxed text-brick">
            Az értesítés le van tiltva ehhez az oldalhoz. A böngésző beállításainál tudod
            visszakapcsolni, utána töltsd újra ezt az oldalt.
          </p>
        )}

        {allapot === "ki" && (
          <>
            <p className="text-[15px] leading-relaxed">Jelenleg nem kapsz értesítést.</p>
            {iosKezdokepernyo && (
              <p className="mt-3 rounded-[10px] border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-muted">
                <strong className="text-ink">iPhone-on egy lépés kell előbb:</strong> a Safari
                megosztás gombjával tedd ki ezt az oldalt a kezdőképernyőre, és onnan nyisd meg.
                Enélkül az Apple nem enged értesítést.
              </p>
            )}
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={bekapcsol}
              disabled={dolgozik}
            >
              {dolgozik ? "Bekapcsolás…" : "Értesítés bekapcsolása"}
            </button>
          </>
        )}

        {allapot === "be" && (
          <>
            <p className="text-[15px] leading-relaxed">
              <strong>Be van kapcsolva</strong> ezen az eszközön.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="btn-ghost" onClick={proba} disabled={dolgozik}>
                {dolgozik ? "Küldés…" : "Próba-értesítés"}
              </button>
              <button type="button" className="btn-quiet" onClick={kikapcsol} disabled={dolgozik}>
                Kikapcsolás ezen az eszközön
              </button>
            </div>
          </>
        )}

        {uzenet && <p className="mt-4 text-[15px] leading-relaxed text-muted">{uzenet}</p>}
      </div>
    </section>
  );
}
