import { connection } from "next/server";
import { notFound } from "next/navigation";
import DeveloperProfile, { PROFILE_TABS, type ProfileTab } from "@/components/admin/developers/DeveloperProfile";
import { getDeveloper, listDeveloperActivity, listDeveloperContacts, listDeveloperNotes } from "@/lib/server/admin/developers";
import { listProjects } from "@/lib/server/developer/developments";
import { registrationCountOf } from "@/lib/server/admin/developer-accounts";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

// Next.js 16: params and searchParams are Promises
export default async function Page({ params, searchParams }: Props) {
  await connection(); // always read fresh data, never prerender at build
  const { id } = await params;
  const { tab } = await searchParams;
  const developer = await getDeveloper(id);
  if (!developer) notFound();
  const [projects, activity, contacts, notes, registrationCount] = await Promise.all([
    listProjects({ developerId: id }),
    listDeveloperActivity(id),
    listDeveloperContacts(id),
    listDeveloperNotes(id),
    registrationCountOf(id),
  ]);
  const initialTab: ProfileTab = PROFILE_TABS.includes(tab as ProfileTab) ? (tab as ProfileTab) : "overview";
  return <DeveloperProfile developer={developer} projects={projects} activity={activity} contacts={contacts} notes={notes} tab={initialTab} registrationCount={registrationCount} />;
}
