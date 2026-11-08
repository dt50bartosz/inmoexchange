import { connection } from "next/server";
import AdminDashboard from "@/components/admin/dashboard/AdminDashboard";
import { getAdminDashboard } from "@/lib/server/admin/dashboard";

export default async function Page() {
  await connection(); // always read fresh data, never prerender at build
  const data = await getAdminDashboard();
  return <AdminDashboard data={data} />;
}
