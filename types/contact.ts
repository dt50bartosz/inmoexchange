import type { ObjectId } from "mongodb";
import type { ContactRole } from "@/lib/schemas/contact";

export type ContactMessageStatus = "new" | "read" | "archived";

/** A message sent with the public contact form /contacto (collection "contact_messages"). */
export interface ContactMessageDoc {
  _id: ObjectId;
  name: string;
  email: string;
  /** "" when not given */
  phone: string;
  role: ContactRole;
  message: string;
  /** Site language the form was sent in ("es", "en", "pl"), to answer in it. */
  locale: string;
  /** When the sender ticked the privacy checkbox. */
  privacyAcceptedAt: Date;
  status: ContactMessageStatus;
  createdAt: Date;
  updatedAt: Date;
}
