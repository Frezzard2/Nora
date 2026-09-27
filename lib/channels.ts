/**
 * Csatorna-adapterek. A demóban csak a chat felület kinézetét adják,
 * de a `send` pont az a hely, ahová később a valódi platform-API kerül.
 */
export type ChannelId = "instagram" | "messenger" | "whatsapp" | "telegram" | "web";

export type ChannelTheme = {
  /** háttér a beszélgetés-sávban */
  surface: string;
  /** érdeklődő buborékja */
  inbound: string;
  /** asszisztens buborékja */
  outbound: string;
  /** buborék lekerekítés */
  radius: string;
  /** fejléc-csík színe */
  accent: string;
};

export type ChannelAdapter = {
  id: ChannelId;
  label: string;
  /** rövid leírás a fejlécben */
  hint: string;
  theme: ChannelTheme;
  /** Valódi integrációnál ide jön a platform kimenő hívása. */
  send(text: string): Promise<void>;
};

const notWired = (label: string) => async () => {
  console.info(`[${label}] adapter: demó módban nincs valódi kimenő hívás.`);
};

export const CHANNELS: Record<ChannelId, ChannelAdapter> = {
  instagram: {
    id: "instagram",
    label: "Instagram",
    hint: "Direct üzenet",
    theme: {
      surface: "#FFFFFF",
      inbound: "#EFEFEF",
      outbound: "#3797F0",
      radius: "20px",
      accent: "#C13584",
    },
    send: notWired("Instagram"),
  },
  messenger: {
    id: "messenger",
    label: "Messenger",
    hint: "Facebook oldal üzenetei",
    theme: {
      surface: "#FFFFFF",
      inbound: "#F0F0F0",
      outbound: "#0084FF",
      radius: "18px",
      accent: "#0084FF",
    },
    send: notWired("Messenger"),
  },
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    hint: "Business üzenet",
    theme: {
      surface: "#ECE5DD",
      inbound: "#FFFFFF",
      outbound: "#D9FDD3",
      radius: "10px",
      accent: "#25D366",
    },
    send: notWired("WhatsApp"),
  },
  telegram: {
    id: "telegram",
    label: "Telegram",
    hint: "Bot beszélgetés",
    theme: {
      surface: "#EEF3F7",
      inbound: "#FFFFFF",
      outbound: "#E1F0FF",
      radius: "12px",
      accent: "#2AABEE",
    },
    send: notWired("Telegram"),
  },
  web: {
    id: "web",
    label: "Weboldal chat",
    hint: "Beágyazott buborék",
    theme: {
      surface: "#F4F2ED",
      inbound: "#FFFFFF",
      outbound: "#1F6F5C",
      radius: "14px",
      accent: "#1F6F5C",
    },
    send: notWired("Weboldal chat"),
  },
};

export const CHANNEL_LIST = Object.values(CHANNELS);

/** Az asszisztens buborékjának szövegszíne a háttérhez igazítva. */
export function outboundTextColor(id: ChannelId): string {
  return id === "whatsapp" || id === "telegram" ? "#15161A" : "#FFFFFF";
}
