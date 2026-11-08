// app/[locale]/panel/mi-agencia/page.tsx
import { notFound } from "next/navigation";
import AgencyDetailsPage from "@/components/agency/AgencyDetailsPage";
import { getAgencyProfile } from "./server/actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const profile = await getAgencyProfile();
  // Only while there is no agency in the database at all (dev mock); with login there always is one
  if (!profile.ok) notFound();
  return <AgencyDetailsPage initial={profile.data} />;
}
