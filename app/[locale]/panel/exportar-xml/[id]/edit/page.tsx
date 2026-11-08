// app/[locale]/panel/exportar-xml/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import ExportForm from "@/components/xml-export/ExportForm";
import { getXmlExport } from "./server/actions";

export const dynamic = "force-dynamic";

// Next.js 16: params is a Promise
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getXmlExport(id);

  // Not found, or it belongs to another agency
  if (!item.ok) notFound();

  return <ExportForm item={item.data} />;
}
