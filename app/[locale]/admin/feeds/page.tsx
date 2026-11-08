import { connection } from "next/server";
import AdminFeedsPage from "@/components/admin/feeds/AdminFeedsPage";
import { listAgencies } from "@/lib/server/admin/agencies";
import { listAllFeeds } from "@/lib/server/admin/feeds";

export default async function Page() {
  await connection(); // always read fresh data, never prerender at build
  const [agencies, feeds] = await Promise.all([listAgencies(), listAllFeeds()]);
  return <AdminFeedsPage agencies={agencies} initialFeeds={feeds} />;
}
