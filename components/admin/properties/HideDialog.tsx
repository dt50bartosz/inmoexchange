"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FormField from "@/components/panel/FormField";
import { hidePropertySchema } from "@/lib/schemas/admin";
import type { AdminProperty, HidePropertyValues } from "@/types/admin";
import { hidePropertyAction } from "@/app/[locale]/admin/properties/server/actions";

const QUICK_REASONS = ["Duplicate of another listing.", "Wrong or misleading price.", "Photos missing or not of this property.", "Property already sold."];

type Props = {
  property: AdminProperty | null;
  agencyName: string;
  /** Called with the server's version of the property after it was hidden. */
  onHidden: (property: AdminProperty) => void;
  onClose: () => void;
};

export default function HideDialog({ property, agencyName, onHidden, onClose }: Props) {
  const form = useForm<HidePropertyValues>({ resolver: zodResolver(hidePropertySchema), defaultValues: { reason: "" } });
  const { register, handleSubmit, formState, reset, setValue } = form;

  useEffect(() => {
    if (property) reset({ reason: "" });
  }, [property, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!property) return;
    try {
      const res = await hidePropertyAction(property.id, values);
      if (!res.ok) throw new Error(res.error);
      onHidden(res.data);
      toast.success(`${property.code} hidden from the network. The agency has been emailed the reason.`);
      onClose();
    } catch {
      toast.error("Something went wrong. Try again.");
    }
  });

  return (
    <Dialog open={property !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Hide {property?.code} from the network?</DialogTitle>
            <DialogDescription>
              Partner agencies and client microsites stop showing it. {agencyName} still sees it in their panel, with your reason.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setValue("reason", r, { shouldValidate: true })}
                className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground outline-none hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {r}
              </button>
            ))}
          </div>
          <FormField label="Reason for the agency" required error={formState.errors.reason?.message}>
            {(p) => <Textarea {...p} rows={3} {...register("reason")} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Hiding…" : "Hide from network"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
