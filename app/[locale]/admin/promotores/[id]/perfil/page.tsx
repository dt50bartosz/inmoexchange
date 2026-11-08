import { connection } from "next/server";
import { notFound } from "next/navigation";
import EditDeveloperPage from "@/components/admin/developers/EditDeveloperPage";
import { getDeveloper, listAdmins } from "@/lib/server/admin/developers";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // always read fresh data, never prerender at build
  const { id } = await params;
  const [developer, admins] = await Promise.all([getDeveloper(id), listAdmins()]);
  if (!developer) notFound();
  return <EditDeveloperPage developer={developer} admins={admins} />;
}
