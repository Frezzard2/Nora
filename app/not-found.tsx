import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata = { title: `${BRAND.name} — nincs ilyen oldal` };

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <h1 className="text-[28px] font-bold leading-tight">Ez az oldal nincs meg</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Lehet, hogy elírás van a címben, vagy a beszélgetés azóta törlődött.
        </p>
        <Link href="/admin" className="btn-primary mt-6">
          Vissza a felületre
        </Link>
      </div>
    </main>
  );
}
