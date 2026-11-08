"use client";

import { useTranslations } from "next-intl";
import { ImageOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadges from "./StatusBadges";
import PropertyRowActions from "./PropertyRowActions";
import StatCell from "./StatCell";
import { usePropertyFormat } from "../usePropertyFormat";
import type { Feed } from "@/lib/schemas/feed";
import { reducedFrom, type Property } from "@/lib/schemas/property";
import type { PropertyStatsSummary } from "@/types/property-events";

type Props = {
  properties: Property[];
  feeds: Feed[];
  stats: PropertyStatsSummary;
  onDelete: (p: Property) => void;
  onToggleHidden: (p: Property) => void;
};

export default function PropertiesTable({ properties, feeds, stats, onDelete, onToggleHidden }: Props) {
  const t = useTranslations("panel.properties");
  const f = usePropertyFormat();
  const feedName = (id: string) => feeds.find((x) => x.id === id)?.name ?? t("list.deletedFeed");

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table className="min-w-[920px]">
        <TableHeader>
          <TableRow>
            <TableHead>{t("list.property")}</TableHead>
            <TableHead className="text-right">{t("list.price")}</TableHead>
            <TableHead>{t("list.specs")}</TableHead>
            <TableHead>{t("list.status")}</TableHead>
            <TableHead>{t("list.source")}</TableHead>
            <TableHead className="text-right">{t("list.views")}</TableHead>
            <TableHead className="text-right">{t("list.whatsappClicks")}</TableHead>
            <TableHead>
              <span className="sr-only">{t("list.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((p) => {
            const title = f.title(p);
            const s = stats[p.id];
            return (
              <TableRow key={p.id} className={p.hidden ? "opacity-60" : undefined}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {p.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photos[0].url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <ImageOff aria-hidden className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={ROUTES.editProperty(p.id)}
                        className="block truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        {title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{p.code}</span> · {t("list.yourRef", { ref: p.reference })} · {p.province}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="font-medium">{f.price(p.price)}</span>
                  {reducedFrom(p) !== null && (
                    <span className="block text-xs text-muted-foreground">
                      <span className="sr-only">{t("list.reducedFrom")} </span>
                      <s>{f.price(reducedFrom(p)!)}</s>
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {t("list.specsFormat", { beds: p.bedrooms, baths: p.bathrooms, m2: p.builtM2 })}
                </TableCell>
                <TableCell>
                  <StatusBadges property={p} />
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-muted-foreground">
                  {p.source.kind === "manual" ? t("list.manual") : feedName(p.source.feedId)}
                </TableCell>
                <StatCell recent={s?.views30 ?? 0} totalText={t("list.statTotal", { n: s?.views ?? 0 })} recentLabel={t("list.last30")} />
                <StatCell recent={s?.whatsapp30 ?? 0} totalText={t("list.statTotal", { n: s?.whatsapp ?? 0 })} recentLabel={t("list.last30")} />
                <TableCell className="text-right">
                  <PropertyRowActions
                    property={p}
                    label={title}
                    onDelete={() => onDelete(p)}
                    onToggleHidden={() => onToggleHidden(p)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

