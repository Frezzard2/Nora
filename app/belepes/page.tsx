import Link from "next/link";
import { cookies } from "next/headers";
import { BRAND } from "@/lib/brand";
import { ROLE_LABEL, SESSION_COOKIE, roleFromCookie } from "@/lib/session";
import LoginForm from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: `${BRAND.name} — belépés` };

export default async function Belepes({
  searchParams,
}: {
  searchParams: Promise<{ tovabb?: string }>;
}) {
  /**
   * Aki már be van léptetve, az linket kap, nem átirányítást. Átirányítással ez
   * az oldal és a middleware egymásra mutatna, ha bármikor nem értenének egyet
   * a munkamenetről — az pedig végtelen újratöltés a böngészőben.
   */
  const role = await roleFromCookie((await cookies()).get(SESSION_COOKIE)?.value);
  const { tovabb } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="font-display text-[30px] font-bold leading-tight">
          {BRAND.name}
        </Link>
        {role ? (
          <>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Már be vagy jelentkezve {ROLE_LABEL[role].toLowerCase()}ként.
            </p>
            <Link href="/admin" className="btn-primary mt-6">
              Tovább a felületre
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Add meg a jelszavadat a felület megnyitásához.
            </p>
            <LoginForm tovabb={tovabb} />
          </>
        )}
      </div>
    </main>
  );
}
