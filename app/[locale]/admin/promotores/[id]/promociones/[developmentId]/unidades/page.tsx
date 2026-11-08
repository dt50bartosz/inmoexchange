// app/[locale]/admin/promotores/[id]/promociones/[developmentId]/unidades/page.tsx
import { connection } from "next/server";
import AdminDevelopmentShell from "@/components/admin/developers/AdminDevelopmentShell";
import EnglishOnly from "@/components/admin/ui/EnglishOnly";
import UnitsTable from "@/components/developer/UnitsTable";
import { loadAdminDevelopment } from "@/lib/server/admin/developments";
import { toProject } from "@/lib/server/developer/developments";
import { listUnits } from "@/lib/server/developer/units";
import { bulkUpdateUnitsAction, createUnitAction, deleteUnitAction, updateUnitAction } from "./server/actions";

type Props = { params: Promise<{ id: string; developmentId: string }> };

/** The developer's units table (shared), on its behalf. */
export default async function Page({ params }: Props) {
  await connection(); // always read fresh data, never prerender at build
  const { id, developmentId } = await params;
  const { developer, development } = await loadAdminDevelopment(id, developmentId);
  const units = await listUnits(id, developmentId);
  return (
    <EnglishOnly>
      <AdminDevelopmentShell developer={developer} project={toProject(development)} unitCount={units.length}>
        <UnitsTable
          units={units}
          currency={development.currency}
          actions={{
            create: createUnitAction.bind(null, id, developmentId),
            update: updateUnitAction.bind(null, id, developmentId),
            remove: deleteUnitAction.bind(null, id, developmentId),
            bulk: bulkUpdateUnitsAction.bind(null, id, developmentId),
          }}
        />
      </AdminDevelopmentShell>
    </EnglishOnly>
  );
}
