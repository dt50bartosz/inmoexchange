import { z } from "zod";
import { RE, V, optionalMatch } from "./shared";

/** Who is writing, from the "I am…" select on /contacto. */
export const CONTACT_ROLES = ["agency", "developer", "buyer", "other"] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_MESSAGE_MAX = 2000;

/**
 * Public contact form (/contacto). Shared by the form and its server action.
 * Error messages are panel.validation keys, translated by FormField.
 */
export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, V.required).max(120, V.tooLong),
  email: z.string().trim().min(1, V.required).max(200, V.tooLong).regex(RE.email, V.email),
  phone: z.string().trim().max(30, V.tooLong).refine(optionalMatch(RE.phone), V.phone),
  role: z.enum(CONTACT_ROLES, { message: V.pickOne }),
  message: z.string().trim().min(1, V.required).max(CONTACT_MESSAGE_MAX, V.tooLong),
  acceptPrivacy: z.boolean().refine((v) => v, V.acceptPrivacy),
  /** Spam trap: a hidden field people never see. Bots fill it in; the server then saves nothing. */
  website: z.string().max(200).optional(),
});

export type ContactMessageInput = z.input<typeof contactMessageSchema>;
