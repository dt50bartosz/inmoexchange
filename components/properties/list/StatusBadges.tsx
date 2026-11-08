"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import type { Property } from "@/lib/schemas/property";

const STATUS_CLASS: Record<Property["status"], string> = {
  active: "bg-success-soft text-success",
  sold: "bg-muted text-muted-foreground",
};

export default function StatusBadges({ property }: { property: Property }) {
  const t = useTranslations("panel.properties");
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="secondary" className={STATUS_CLASS[property.status]}>
        {t(`statuses.${property.status}`)}
      </Badge>
      {property.condition === "newBuild" && <Badge className="bg-info-soft text-info">{t("conditions.newBuild")}</Badge>}
      {property.hidden && <Badge variant="outline">{t("statuses.hidden")}</Badge>}
      {property.shared && !property.hidden && property.status === "active" && (
        <Badge variant="outline">{t("statuses.shared")}</Badge>
      )}
    </div>
  );
}
