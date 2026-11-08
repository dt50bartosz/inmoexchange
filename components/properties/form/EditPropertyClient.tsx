"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import PropertyForm from "./PropertyForm";
import { useProperty } from "../store";

export default function EditPropertyClient({ id }: { id: string }) {
  const t = useTranslations("panel.properties.form");
  const property = useProperty(id);

  if (!property) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("notFoundBody")}</p>
        <Link href={ROUTES.properties} className={`${buttonVariants({ variant: "outline" })} mt-6`}>
          {t("backToList")}
        </Link>
      </div>
    );
  }
  return <PropertyForm key={property.id} property={property} />;
}
