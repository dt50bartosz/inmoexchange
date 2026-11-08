"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginEmailToast } from "../ui/loginEmailToast";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addAgencySchema } from "@/lib/schemas/admin";
import type { AddAgencyValues, AgencyApplication } from "@/types/admin";
import AgencyFields, { EMPTY_AGENCY } from "../agencies/AgencyFields";
import { approveApplicationAction } from "@/app/[locale]/admin/applications/server/actions";

type Props = {
  application: AgencyApplication | null;
  /** Called with the server's version of the application after it was approved. */
  onDecided: (application: AgencyApplication) => void;
  onClose: () => void;
};

const fromApplication = (a: AgencyApplication): AddAgencyValues => ({
  ...EMPTY_AGENCY,
  name: a.agencyName,
  legalName: a.legalName,
  cif: a.cif,
  contactPerson: a.contactPerson,
  email: a.email,
  phone: a.phone,
  town: a.town,
  regions: a.regions,
  // Developers don't get an agency XML feed (the server drops it too)
  feedUrl: a.registration?.accountType === "developer" ? "" : a.feedUrl,
});

/** Approve = check the details, pick their areas, create the agency and send the invite. */
export default function ApproveDialog({ application, onDecided, onClose }: Props) {
  const form = useForm<AddAgencyValues>({ resolver: zodResolver(addAgencySchema), defaultValues: EMPTY_AGENCY, mode: "onTouched" });
  const { handleSubmit, formState, reset, setError } = form;

  useEffect(() => {
    if (application) reset(fromApplication(application));
  }, [application, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!application) return;
    let res: Awaited<ReturnType<typeof approveApplicationAction>>;
    try {
      res = await approveApplicationAction(application.id, values);
    } catch {
      toast.error("Couldn't approve the application. Try again.");
      return;
    }
    if (!res.ok) {
      if (res.error === "email_taken") {
        setError("email", { type: "server", message: "This email is already used by another agency." });
      } else if (res.error === "already_decided") {
        toast.error("This application was already approved or rejected.");
      } else {
        toast.error("Couldn't approve the application. Try again.");
      }
      return;
    }
    onDecided(res.data.application);
    toast.success(`${values.name} approved.`);
    loginEmailToast(values.email, res.data.email);
    if (res.data.feed === "failed") toast.warning("The XML feed couldn't be read. Add it again from the agency's panel.");
    onClose();
  });

  return (
    <Dialog open={application !== null} onOpenChange={(o) => !o && !formState.isSubmitting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Approve {application?.agencyName}</DialogTitle>
            <DialogDescription>
              {application?.registration?.accountType === "developer" ? (
                <>
                  Check their details and add what the developer form doesn&apos;t ask (CIF, town, areas). Approving creates a{" "}
                  <strong>developer account</strong> and emails the login details. Developer accounts don&apos;t import XML feeds, so no feed is added.
                </>
              ) : (
                <>
                  Check their details and choose their areas{application?.areas ? <> (they said: “{application.areas}”)</> : null}. Approving creates the
                  agency with all their register form details and emails the login details.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <AgencyFields form={form} compact />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Approving…" : "Approve and send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
