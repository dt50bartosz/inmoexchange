// app/[locale]/panel/exportar-xml/page.tsx
import ExportsPage from "@/components/xml-export/ExportsPage";
import { getXmlExports } from "./server/actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const res = await getXmlExports();
  return <ExportsPage initialItems={res.ok ? res.data : []} />;
}
