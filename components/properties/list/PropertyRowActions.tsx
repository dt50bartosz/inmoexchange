"use client";

import { useTranslations } from "next-intl";
import { Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Property } from "@/lib/schemas/property";

type Props = {
  property: Property;
  label: string;
  onDelete: () => void;
  onToggleHidden: () => void;
};

export default function PropertyRowActions({ property, label, onDelete, onToggleHidden }: Props) {
  const t = useTranslations("panel.properties.actions");
  const router = useRouter();
  const isFeed = property.source.kind === "feed";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={t("menuFor", { property: label })} />}>
        <MoreHorizontal aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(ROUTES.editProperty(property.id))}>
          <Pencil aria-hidden />
          {isFeed ? t("viewAndSharing") : t("edit")}
        </DropdownMenuItem>
        {isFeed ? (
          <DropdownMenuItem onClick={onToggleHidden}>
            {property.hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
            {property.hidden ? t("show") : t("hide")}
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 aria-hidden />
              {t("delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
