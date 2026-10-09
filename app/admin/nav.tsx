"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Áttekintő" },
  { href: "/admin/beszelgetesek", label: "Beszélgetések" },
  { href: "/admin/kommentek", label: "Komment-szabályok" },
  { href: "/admin/beallitasok", label: "Beállítások" },
];

const OWNER_ITEMS = [
  { href: "/simulator", label: "Szimulátor" },
  { href: "/onboarding", label: "Varázsló" },
];

export default function AdminNav({ owner }: { owner: boolean }) {
  const path = usePathname();
  const items = owner ? [...ITEMS, ...OWNER_ITEMS] : ITEMS;

  return (
    <nav className="border-b border-line bg-card">
      {/* mobilon vízszintesen csúsztatható, hogy ne tördelődjön szét */}
      <div className="mx-auto flex max-w-[1100px] gap-1 overflow-x-auto px-2 py-2 sm:px-6">
        {items.map((item) => {
          const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-[10px] px-3.5 py-2.5 text-[15px] transition ${
                active ? "bg-green-soft font-semibold text-green-dark" : "text-muted hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
