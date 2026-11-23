import { connection } from "next/server";
import { notFound } from "next/navigation";
import LegalDocAdmin from "@/components/admin/legal/LegalDocAdmin";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { isLegalDocKey, listVersions } from "@/lib/server/legal-docs";

type Props = { params: Promise<{ key: string }> };

/** One legal document: its version history and the draft editor. */
export default async function Page({ params }: Props) {
  await connection(); // always read fresh data, never prerender at build
  await requireAdmin();
  const { key } = await params;
  if (!isLegalDocKey(key)) notFound();
  const versions = await listVersions(key);
  return <LegalDocAdmin docKey={key} versions={versions} />;
}
