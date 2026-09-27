"use client";

import { BRAND } from "./brand";
import { emptyConfig, type NoraConfig } from "./types";

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

/** Importált JSON-t összefésüli az üres alapértelmezéssel, hogy hiányzó mező ne dobjon hibát. */
export function mergeConfig(input: unknown): NoraConfig {
  const base = emptyConfig();
  if (typeof input !== "object" || input === null) return base;
  const src = input as Record<string, unknown>;

  for (const key of Object.keys(base) as (keyof NoraConfig)[]) {
    const value = src[key];
    if (Array.isArray(base[key])) {
      if (Array.isArray(value)) base[key] = value as never;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      base[key] = { ...base[key], ...value } as never;
    }
  }
  return base;
}
