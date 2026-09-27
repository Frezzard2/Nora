"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import { Instagram, Messenger, Send, Telegram, WebChat, WhatsApp } from "@/components/icons";
import { CHANNELS, CHANNEL_LIST, outboundTextColor, type ChannelId } from "@/lib/channels";
import { SCENARIOS } from "@/lib/scenarios";
import { loadConfig, mergeConfig } from "@/lib/storage";
import { emptyConfig, type NoraConfig } from "@/lib/types";

const CEL_LABEL: Record<string, string> = {
  hivas: "Hívásfoglalás",
  termeklink: "Terméklink megnyitása",
  email: "E-mail cím megadása",
};

const ICONS: Record<ChannelId, typeof Instagram> = {
  instagram: Instagram,
  messenger: Messenger,
  whatsapp: WhatsApp,
  telegram: Telegram,
  web: WebChat,
};

type Msg = { role: "user" | "assistant"; text: string; handover?: boolean };

export default function Simulator() {
  const [config, setConfig] = useState<NoraConfig | null>(null);
  const [channel, setChannel] = useState<ChannelId>("instagram");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setConfig(mergeConfig(loadConfig() ?? emptyConfig())), []);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy]);

  const adapter = CHANNELS[channel];
  const { theme } = adapter;

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy || !config) return;

    const history: Msg[] = [...messages, { role: "user", text: clean }];
    setMessages(history);
    setDraft("");
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          config,
          history: history.map((m) => ({ source: channel, role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ismeretlen hiba.");

      setMessages([...history, { role: "assistant", text: data.text, handover: data.handover }]);
      await adapter.send(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nem sikerült elküldeni az üzenetet.");
    } finally {
      setBusy(false);
    }
  }

  const bubble = (role: "user" | "assistant") =>
    role === "user"
      ? {
          background: theme.inbound,
          color: "#15161A",
          borderRadius: `${theme.radius} ${theme.radius} ${theme.radius} 6px`,
        }
      : {
          background: theme.outbound,
          color: outboundTextColor(channel),
          borderRadius: `${theme.radius} ${theme.radius} 6px ${theme.radius}`,
        };

  const nevInicial = (config?.alapok.nev || "Érdeklődő")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar tag="Próbamód">
        <Link href="/onboarding" className="btn-ghost">
          Beállítás szerkesztése
        </Link>
      </TopBar>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Csatornaváltó */}
        <nav className="border-b border-line bg-card lg:w-[236px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex gap-1.5 overflow-x-auto px-4 py-4 lg:flex-col lg:px-4 lg:py-6">
            <span className="micro hidden px-2.5 pb-2.5 lg:block">Csatorna</span>
            {CHANNEL_LIST.map((c) => {
              const Icon = ICONS[c.id];
              const on = c.id === channel;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  aria-pressed={on}
                  className={`flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 transition lg:w-full ${
                    on ? "bg-ink text-white" : "text-muted hover:bg-paper hover:text-ink"
                  }`}
                >
                  <Icon />
                  <span className={`whitespace-nowrap text-[15px] ${on ? "font-semibold" : ""}`}>
                    {c.label}
                  </span>
                </button>
              );
            })}

            <div className="hidden flex-1 lg:block" />
            <div className="hidden rounded-xl border border-line bg-paper p-3.5 lg:block">
              <p className="text-[13px] font-semibold">Egy asszisztens</p>
              <p className="mt-1 text-[13px] leading-snug text-muted">
                Minden csatornán ugyanaz a hangnem és tudás. Csak a felület változik.
              </p>
            </div>
          </div>
        </nav>

        {/* Beszélgetés */}
        <main className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">
          <div className="card flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-2xl">
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-line text-[15px] font-semibold text-muted">
                {nevInicial || "ÉR"}
              </span>
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold">Érdeklődő</span>
                <span className="text-[13px] text-muted">
                  {adapter.label} · {adapter.hint}
                </span>
              </span>
              {messages.length > 0 && (
                <button
                  type="button"
                  className="ml-auto text-sm font-semibold text-muted hover:text-ink"
                  onClick={() => {
                    setMessages([]);
                    setActiveScenario(null);
                    setError(null);
                  }}
                >
                  Új beszélgetés
                </button>
              )}
            </div>

            <div
              className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-5"
              style={{ background: theme.surface }}
            >
              {messages.length === 0 && (
                <p className="m-auto max-w-[320px] text-center text-[15px] leading-relaxed text-muted">
                  Írj érdeklődőként, vagy válassz egy teszt-szcenáriót.
                </p>
              )}

              {messages.map((m, i) =>
                m.handover ? (
                  <div key={i} className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-brick px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                      Átadva embernek
                    </span>
                    <div
                      className="max-w-[78%] border-[1.5px] border-brick bg-card px-4 py-3 text-[15px] leading-relaxed text-ink sm:max-w-[62%]"
                      style={{ borderRadius: `${theme.radius} ${theme.radius} 6px ${theme.radius}` }}
                    >
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className="max-w-[78%] whitespace-pre-wrap px-4 py-3 text-[15px] leading-relaxed sm:max-w-[62%]"
                      style={bubble(m.role)}
                    >
                      {m.text}
                    </div>
                  </div>
                ),
              )}

              {busy && (
                <div className="flex justify-end">
                  <div
                    className="px-4 py-3 text-[15px] text-muted"
                    style={{ ...bubble("assistant"), background: theme.inbound, color: "#5C5E66" }}
                  >
                    ír…
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {error && (
              <p className="border-t border-brick/30 bg-brick-soft px-5 py-3 text-sm text-brick">
                {error}
              </p>
            )}

            <form
              className="flex items-center gap-3 border-t border-line px-5 py-4"
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
            >
              <label htmlFor="uzenet" className="sr-only">
                Üzenet írása érdeklődőként
              </label>
              <input
                id="uzenet"
                className="field rounded-full"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Írj érdeklődőként…"
                disabled={busy}
              />
              <button
                type="submit"
                aria-label="Üzenet küldése"
                disabled={busy || !draft.trim()}
                className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-green text-white transition hover:bg-green-dark disabled:opacity-40"
              >
                <Send />
              </button>
            </form>
          </div>
        </main>

        {/* Szcenáriók és aktív beállítás */}
        <aside className="border-t border-line bg-card lg:w-[318px] lg:shrink-0 lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-6 px-5 py-6">
            <div className="flex flex-col gap-2.5">
              <span className="micro">Teszt-szcenáriók</span>
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setActiveScenario(s.id);
                    send(s.message);
                  }}
                  className={`min-h-[46px] rounded-[11px] border px-4 py-3 text-left text-sm transition disabled:opacity-50 ${
                    activeScenario === s.id
                      ? "border-[1.5px] border-brick bg-brick-soft font-semibold text-ink"
                      : "border-line bg-input text-ink hover:border-line-strong"
                  }`}
                >
                  {s.label}
                  {activeScenario === s.id ? " · most fut" : ""}
                </button>
              ))}
            </div>

            <div className="h-px bg-line" />

            <div className="flex flex-col gap-3">
              <span className="micro">Aktív beállítás</span>
              <Row label="Coach">{config?.alapok.nev || "nincs megadva"}</Row>
              <Row label="Hangnem">
                {config
                  ? `${
                      config.hangnem.megszolitas === "tegezodes" ? "Tegeződés" : "Magázódás"
                    } · ${config.hangnem.valaszHossz} válaszok`
                  : "—"}
              </Row>
              <Row label="Cél">{config ? CEL_LABEL[config.ajanlat.cel] : "—"}</Row>
              <Row label="Ár elárulható">
                {config ? (config.ajanlat.arElarulhato ? "Igen" : "Csak híváson") : "—"}
              </Row>
              <Row label="DM-minták">
                {config?.hangnem.dmPeldak.trim() ? "Betöltve" : "Nincs megadva"}
              </Row>
            </div>

            {config && !config.alapok.nev && (
              <div className="rounded-xl border border-line bg-paper p-4">
                <p className="text-[13px] font-semibold">Üres a konfiguráció</p>
                <p className="mt-1 text-[13px] leading-snug text-muted">
                  Az asszisztens így is válaszol, de a{" "}
                  <Link href="/onboarding" className="font-semibold text-green underline">
                    beállítás
                  </Link>{" "}
                  nélkül nem tudja, ki vagy.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-line bg-paper p-4">
              <p className="text-[13px] font-semibold">Átadás embernek</p>
              <p className="mt-1 text-[13px] leading-snug text-muted">
                {config?.hatarok.atadasEsetei.length
                  ? `${config.hatarok.atadasEsetei.join(", ")} esetén az asszisztens megáll, és szól neked.`
                  : "Nincs beállítva átadási eset."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] text-micro">{label}</span>
      <span className="text-[15px]">{children}</span>
    </div>
  );
}
