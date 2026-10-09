import { clientConfig } from "@/lib/clientConfig";
import { configGaps } from "@/lib/readiness";
import { ruleHits } from "@/lib/store";
import RulesForm from "./form";

export const dynamic = "force-dynamic";

export default async function Kommentek() {
  const { config } = await clientConfig();
  const hits = await ruleHits(config.commentRules.map((r) => r.id));
  // ha az AI írja a privát választ, ahhoz kitöltött alap-konfiguráció kell
  return <RulesForm initial={config} hits={hits} configIncomplete={configGaps(config).length > 0} />;
}
