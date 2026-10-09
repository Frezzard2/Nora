import { clientConfig } from "@/lib/clientConfig";
import SettingsForm from "./form";

export const dynamic = "force-dynamic";

export default async function Beallitasok() {
  // az éppen élő konfigurációt szerkesztjük, nem egy böngészőben tárolt piszkozatot
  const { config } = await clientConfig();
  return <SettingsForm initial={config} />;
}
