"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { loginEmailToast } from "../ui/loginEmailToast";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import PanelCard from "@/components/panel/PanelCard";
import PanelSection from "@/components/panel/PanelSection";
import { useUnsavedWarning } from "@/components/panel/useUnsavedWarning";
import { focusFirstInvalid } from "@/components/panel/mock";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { addAgencySchema } from "@/lib/schemas/admin";
import type { AddAgencyValues } from "@/types/admin";
import AdminPage from "../ui/AdminPage";
import AgencyFields, { EMPTY_AGENCY } from "./AgencyFields";
import { addAgencyAction } from "@/app/[locale]/admin/agencies/new/server/actions";

export default function AddAgencyPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm<AddAgencyValues>({ resolver: zodResolver(addAgencySchema), defaultValues: EMPTY_AGENCY, mode: "onTouched" });
  const { handleSubmit, formState, setError } = form;
  useUnsavedWarning(formState.isDirty && !formState.isSubmitSuccessful);

  const onSubmit = handleSubmit(
    async (values) => {
      let res: Awaited<ReturnType<typeof addAgencyAction>>;
      try {
        res = await addAgencyAction(values);
      } catch {
        toast.error("Couldn't create the agency. Try again.");
        return;
      }
      if (!res.ok) {
        if (res.error === "email_taken") {
          setError("email", { type: "server", message: "This email is already used by another agency." });
          toast.error("This email is already used by another agency.");
        } else {
          toast.error("Couldn't create the agency. Try again.");
        }
        return;
      }
      toast.success(`${values.name} created.`);
      loginEmailToast(values.email, res.data.email);
      if (res.data.feed === "failed") toast.warning("The XML feed couldn't be read. Add it again from the agency's panel.");
      router.push(ADMIN_ROUTES.agency(res.data.id));
    },
    () => focusFirstInvalid(formRef.current)
  );

  return (
    <AdminPage
      title="Add agency"
      description="Creates the agency and its login (their email), then emails a temporary password. They choose their own password at first login."
      back={
        <Link href={ADMIN_ROUTES.agencies} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Agencies
        </Link>
      }
    >
      <form ref={formRef} noValidate onSubmit={onSubmit}>
        <PanelCard>
          <PanelSection title="Agency" description="They can change these details later in their own panel.">
            <AgencyFields form={form} />
          </PanelSection>
        </PanelCard>
        <div className="sticky bottom-0 z-30 -mx-4 mt-6 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <Link href={ADMIN_ROUTES.agencies} className={buttonVariants({ variant: "outline" })}>
            Cancel
          </Link>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Creating…" : "Create agency and send invite"}
          </Button>
        </div>
      </form>
    </AdminPage>
  );
}
