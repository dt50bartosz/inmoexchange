import { connection } from "next/server";
import DeveloperCrmPage, { type CrmFilters } from "@/components/admin/developers/DeveloperCrmPage";
import { getDeveloperCrm, listRecentActivity } from "@/lib/server/admin/developers";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const pick = (sp: Record<string, string | string[] | undefined>, key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

export default async function Page({ searchParams }: Props) {
  await connection(); // always read fresh data, never prerender at build
  const sp = await searchParams;
  const initial: CrmFilters = { q: pick(sp, "q"), status: pick(sp, "status"), location: pick(sp, "location"), activity: pick(sp, "activity"), sort: pick(sp, "sort") };
  const [{ rows, stats }, recent] = await Promise.all([getDeveloperCrm(), listRecentActivity()]);
  // key: following a stat card link to other filters starts the page fresh
  return <DeveloperCrmPage key={JSON.stringify(initial)} rows={rows} stats={stats} recent={recent} initial={initial} />;
}
