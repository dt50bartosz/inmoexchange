import { connection } from "next/server";
import ApplicationsPage from "@/components/admin/applications/ApplicationsPage";
import { listApplications } from "@/lib/server/admin/applications";

export default async function Page() {
  await connection(); // always read fresh data, never prerender at build
  const applications = await listApplications();
  return <ApplicationsPage initialApplications={applications} />;
}
