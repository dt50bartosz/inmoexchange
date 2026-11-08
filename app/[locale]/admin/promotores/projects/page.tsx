import { connection } from "next/server";
import ProjectsListPage, { type ProjectFilters } from "@/components/admin/developers/ProjectsListPage";
import { getDeveloperCrm } from "@/lib/server/admin/developers";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const pick = (sp: Record<string, string | string[] | undefined>, key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

export default async function Page({ searchParams }: Props) {
  await connection(); // always read fresh data, never prerender at build
  const sp = await searchParams;
  const initial: ProjectFilters = {
    q: pick(sp, "q"),
    status: pick(sp, "status"),
    developer: pick(sp, "developer"),
    stale: pick(sp, "stale"),
    updated: pick(sp, "updated"),
    location: pick(sp, "location"),
  };
  const { projects } = await getDeveloperCrm();
  return <ProjectsListPage key={JSON.stringify(initial)} projects={projects} initial={initial} />;
}
