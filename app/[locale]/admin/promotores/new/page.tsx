import { connection } from "next/server";
import NewDeveloperPage from "@/components/admin/developers/NewDeveloperPage";
import { listAdmins, listConvertibleAgencies } from "@/lib/server/admin/developers";

export default async function Page() {
  await connection(); // always read fresh data, never prerender at build
  const [admins, agencies] = await Promise.all([listAdmins(), listConvertibleAgencies()]);
  return <NewDeveloperPage admins={admins} agencies={agencies} />;
}
