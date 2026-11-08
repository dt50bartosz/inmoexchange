"use client";

import { Controller } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import FormField from "@/components/panel/FormField";
import PanelSection from "@/components/panel/PanelSection";
import SimpleSelect from "@/components/panel/SimpleSelect";
import EnglishOnly from "@/components/admin/ui/EnglishOnly";
import DeveloperProfileForm from "@/components/developer/DeveloperProfileForm";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { createAdminUploadUrls } from "@/lib/actions/upload";
import { developerProfileSchema } from "@/lib/schemas/developers";
import type { AdminOption, Developer, DeveloperProfileValues } from "@/types/developers";
import { updateDeveloperAction } from "@/app/[locale]/admin/promotores/server/actions";
import AdminPage from "../ui/AdminPage";

type Props = { developer: Developer; admins: AdminOption[] };

const toValues = (d: Developer): DeveloperProfileValues => ({
  name: d.name,
  legalName: d.legalName,
  cif: d.cif,
  description: d.description,
  website: d.website,
  contactPerson: d.contactPerson,
  contactPosition: d.contactPosition,
  contactEmail: d.contactEmail,
  phone: d.phone,
  street: d.street,
  town: d.town,
  postcode: d.postcode,
  province: d.province,
  country: d.country,
  regions: d.regions,
  relationshipManagerId: d.relationshipManager?.id ?? "",
});

/** Admin → developer → Edit: the developer's own profile form (shared), plus the CRM's relationship manager. */
export default function EditDeveloperPage({ developer, admins }: Props) {
  const back = ADMIN_ROUTES.developer(developer.id);

  return (
    <AdminPage
      title={`Edit ${developer.name}`}
      description="The same profile the developer edits in its own panel; it sees “Edited by Colabora MLS” after you save. The login email is on the Account tab."
      back={
        <Link href={back} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          {developer.name}
        </Link>
      }
    >
      <EnglishOnly>
        <DeveloperProfileForm<DeveloperProfileValues>
          schema={developerProfileSchema}
          defaultValues={toValues(developer)}
          logoUrl={developer.logo}
          requestUploadUrls={createAdminUploadUrls}
          onSave={(values, logo) => updateDeveloperAction(developer.id, values, logo)}
          doneHref={back}
          extraSections={(form) => (
            <PanelSection title="CRM" description="Internal: the developer never sees this.">
              <FormField label="Relationship manager" hint="Optional" error={form.formState.errors.relationshipManagerId?.message}>
                {(p) => (
                  <Controller
                    control={form.control}
                    name="relationshipManagerId"
                    render={({ field }) => (
                      <SimpleSelect
                        {...p}
                        value={field.value || "none"}
                        onChange={(v) => field.onChange(v === "none" ? "" : v)}
                        options={[{ value: "none", label: "Nobody yet" }, ...admins.map((a) => ({ value: a.id, label: a.email }))]}
                      />
                    )}
                  />
                )}
              </FormField>
            </PanelSection>
          )}
        />
      </EnglishOnly>
    </AdminPage>
  );
}
