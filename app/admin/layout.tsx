import TopBar from "@/components/TopBar";
import { currentRole } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { ROLE_LABEL } from "@/lib/session";
import { logout } from "@/app/belepes/actions";
import AdminNav from "./nav";

export const metadata = { title: `${BRAND.name} — felület` };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await currentRole();

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar tag={ROLE_LABEL[role]}>
        <form action={logout}>
          <button type="submit" className="btn-quiet">
            Kilépés
          </button>
        </form>
      </TopBar>

      <AdminNav owner={role === "owner"} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
