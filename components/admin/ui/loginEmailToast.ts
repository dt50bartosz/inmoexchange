import { toast } from "sonner";
import type { EmailResult } from "@/lib/server/email";

/** Tells the admin whether the login details email went out. */
export function loginEmailToast(email: string, result: EmailResult | undefined) {
  if (result === "sent") toast.success(`Login details sent to ${email}.`);
  else if (result === "not_configured")
    toast.warning("Email isn’t set up (SMTP_HOST / SMTP_USER / SMTP_PASS), so no login details were sent. Use “Send login details” once it is.");
  else toast.error(`The login details email to ${email} failed. Try “Send login details” on the agency's page.`);
}
