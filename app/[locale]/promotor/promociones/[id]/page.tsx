// app/[locale]/promotor/promociones/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DevelopmentEditor from "@/components/developer/DevelopmentEditor";
import { collections } from "@/lib/db";
import { requireRole } from "@/lib/server/auth/require-role";
import { findProjectDoc, toProject } from "@/lib/server/developer/developments";

type Props = { params: Promise<{ id: string }> };

/** Only the developer's own developments: another developer's id is a 404. */
async function load(id: string) {
  const { accountId } = await requireRole("developer");
  const doc = await findProjectDoc(id, accountId);
  if (!doc) notFound();
  const unitCount = await collections.devUnits.countDocuments({ developerId: accountId, developmentId: id });
  return { project: toProject(doc), unitCount };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { project } = await load((await params).id);
  return { title: project.name };
}

export default async function DevelopmentPage({ params }: Props) {
  const { project, unitCount } = await load((await params).id);
  return <DevelopmentEditor project={project} unitCount={unitCount} />;
}
