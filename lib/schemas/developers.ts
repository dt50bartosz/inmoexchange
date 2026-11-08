import { z } from "zod";
import { RE, V, optionalMatch } from "./shared";
import { companyProfileSchema } from "./developer-profile";

/*
 * Developer CRM schemas — shared by the forms (zodResolver) and the server actions.
 * Messages are translation keys under panel.validation (FormField translates them).
 */

const text = (max: number) => z.string().trim().max(max, V.tooLong);
const required = (max: number) => text(max).min(1, V.required);
/** Hex _id as a string (no mongodb import: this file also runs in the browser). */
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const objectIdOrEmpty = z.string().refine((v) => v === "" || OBJECT_ID.test(v), V.required);

/**
 * Company details the admin edits (Developer CRM → developer → Edit): the developer's own profile
 * (lib/schemas/developer-profile.ts, the same fields the developer edits) plus the CRM's relationship manager.
 * Login email is changed by the developer.
 */
export const developerProfileSchema = companyProfileSchema.extend({
  relationshipManagerId: objectIdOrEmpty,
});

/** Developer CRM → Add developer: the profile plus its login. */
export const newDeveloperSchema = developerProfileSchema.extend({
  email: z.string().trim().min(1, V.required).regex(RE.email, V.email),
  /** Email a temporary password now. Off = the account waits ("Pending") until the admin sends it. */
  sendInvite: z.boolean(),
});

/** Turns an existing agency account into a developer (keeps everything it has). */
export const convertToDeveloperSchema = z.object({ agencyId: z.string().refine((v) => OBJECT_ID.test(v), V.required) });

/* The development (project) schema lives in lib/schemas/developments.ts. */

export const developerContactSchema = z.object({
  name: required(120),
  position: text(80),
  email: z.string().trim().refine(optionalMatch(RE.email), V.email),
  phone: z.string().trim().refine(optionalMatch(RE.phone), V.phone),
  notes: text(500),
});

/** Internal admin note (editable, deletable). projectId "" = about the developer in general. */
export const developerNoteSchema = z.object({
  body: required(4000),
  projectId: objectIdOrEmpty,
});

/** A manual entry in a project's update history (permanent, like every other entry). */
export const manualUpdateSchema = z.object({
  description: required(1000),
});
