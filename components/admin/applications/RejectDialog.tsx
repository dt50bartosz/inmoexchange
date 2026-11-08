"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FormField from "@/components/panel/FormField";
import { rejectApplicationSchema } from "@/lib/schemas/admin";
import type { AgencyApplication, RejectApplicationValues } from "@/types/admin";
import { rejectApplicationAction } from "@/app/[locale]/admin/applications/server/actions";

type Props = {
  application: AgencyApplication | null;
  /** Called with the server's version of the application after it was rejected. */
  onDecided: (application: AgencyApplication) => void;
  onClose: () => void;
};

export default function RejectDialog({ application, onDecided, onClose }: Props) {
  const form = useForm<RejectApplicationValues>({ resolver: zodResolver(rejectApplicationSchema), defaultValues: { reason: "" } });
  const { register, handleSubmit, formState, reset } = form;

  useEffect(() => {
    if (application) reset({ reason: "" });
  }, [application, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!application) return;
    try {
      const res = await rejectApplicationAction(application.id, values);
      if (!res.ok) {
        toast.error(res.error === "already_decided" ? "This application was already approved or rejected." : "Couldn't reject the application. Try again.");
        return;
      }
      onDecided(res.data.application);
      toast.success(`${application.agencyName} rejected.`);
      if (res.data.email && res.data.email !== "sent") toast.warning(`The email to ${application.email} couldn't be sent. Let them know another way.`);
      onClose();
    } catch {
      toast.error("Couldn't reject the application. Try again.");
    }
  });

  return (
    <Dialog open={application !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Reject {application?.agencyName}?</DialogTitle>
            <DialogDescription>We'll email {application?.email} to say the application wasn't accepted.</DialogDescription>
          </DialogHeader>
          <FormField label="Reason" hint="Optional, included in the email" error={formState.errors.reason?.message}>
            {(p) => <Textarea {...p} rows={3} {...register("reason")} placeholder="e.g. We only accept registered Spanish agencies for now." />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Rejecting…" : "Reject application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
