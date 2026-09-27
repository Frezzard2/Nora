import Link from "next/link";
import type { ReactNode } from "react";
import { Bubble } from "@/components/icons";
import { BRAND } from "@/lib/brand";

export default function TopBar({ tag, children }: { tag?: string; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-card">
      <div className="mx-auto flex min-h-[68px] max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-green text-white">
              <Bubble />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">{BRAND.name}</span>
          </Link>
          {tag ? <span className="tag ml-1">{tag}</span> : null}
        </div>
        {children ? <div className="flex items-center gap-3 sm:gap-4">{children}</div> : null}
      </div>
    </header>
  );
}
