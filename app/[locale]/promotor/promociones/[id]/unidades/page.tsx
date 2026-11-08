// app/[locale]/promotor/promociones/[id]/unidades/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import DevelopmentTabs from "@/components/developer/DevelopmentTabs";
import UnitsTable from "@/components/developer/UnitsTable";
import { VisibilityBadge } from "@/components/developer/DevelopmentBadges";
import { PROMOTOR_ROUTES } from "@/lib/constants/routes";
import { requireRole } from "@/lib/server/auth/require-role";
import { findProjectDoc } from "@/lib/server/developer/developments";
import { listUnits } from "@/lib/server/developer/units";
import { bulkUpdateUnitsAction, createUnitAction, deleteUnitAction, updateUnitAction } from "./server/actions";

type Props = { params: Promise<{ id: string }> };

/** Only the developer's own development: another developer's id is a 404. */
async function load(id: string) {
  const { accountId } = await requireRole("developer");
  const development = await findProjectDoc(id, accountId);
  if (!development) notFound();
  return { development, units: await listUnits(accountId, id) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { development } = await load((await params).id);
  const t = await getTranslations("units");
  return { title: `${t("title")} · ${development.name}` };
}

export default async function UnitsPage({ params }: Props) {
  const { id } = await params;
  const { development, units } = await load(id);
  const t = await getTranslations("promotor.developments");

  return (
    <div className="space-y-6">
      <div>
        <Link href={PROMOTOR_ROUTES.developments} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          {t("title")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{development.name}</h1>
        <div className="mt-2">
          <VisibilityBadge visibility={development.visibility ?? "published"} />
        </div>
      </div>
      <DevelopmentTabs base={PROMOTOR_ROUTES.development(id)} unitCount={units.length} />
      <UnitsTable
        units={units}
        currency={development.currency}
        actions={{
          create: createUnitAction.bind(null, id),
          update: updateUnitAction.bind(null, id),
          remove: deleteUnitAction.bind(null, id),
          bulk: bulkUpdateUnitsAction.bind(null, id),
        }}
      />
    </div>
  );
}
