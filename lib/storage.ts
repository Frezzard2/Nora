"use client";

import { BRAND } from "./brand";
import { mergeConfig, type NoraConfig } from "./types";

// a varázsló és a szimulátor innen importálja — a megvalósítás a types.ts-ben van
export { mergeConfig };

export function loadConfig(): NoraConfig | null {
  try {
    const raw = localStorage.getItem(BRAND.storageKey);
    return raw ? (JSON.parse(raw) as NoraConfig) : null;
  } catch {
    return null;
  }
}

export function saveConfig(config: NoraConfig) {
  try {
    localStorage.setItem(BRAND.storageKey, JSON.stringify(config));
  } catch {
    /* privát mód, tele tároló — a demó ettől még működik */
  }
}

export function exportConfig(config: NoraConfig) {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${BRAND.name.toLowerCase()}-config.json`;
  a.click();
  URL.revokeObjectURL(url);
}
