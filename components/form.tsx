"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Choice<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={value === o.value ? "pill-on" : "pill"}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left text-[15px]"
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-green" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
      <span className={checked ? "text-ink" : "text-muted"}>{label}</span>
    </button>
  );
}

export function CheckRow({
  checked,
  onChange,
  label,
  onRemove,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  onRemove?: () => void;
}) {
  return (
    <div className="flex min-h-[46px] items-center gap-3 rounded-[10px] border border-line bg-input px-3.5 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-[#1F6F5C]"
      />
      <span className="flex-1 text-[15px]">{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="text-sm font-semibold text-muted hover:text-brick"
        >
          Törlés
        </button>
      ) : null}
    </div>
  );
}
