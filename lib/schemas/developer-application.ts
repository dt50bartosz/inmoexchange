import { z } from "zod";
import { RE, V, optionalMatch } from "./shared";

/** "Number of active developments" on the /promotoras form. */
export const ACTIVE_DEVELOPMENTS = ["1", "2-5", "6-10", "10+"] as const;
export type ActiveDevelopments = (typeof ACTIVE_DEVELOPMENTS)[number];

export const DEVELOPER_MESSAGE_MAX = 2000;

const text = (max: number) => z.string().trim().max(max, V.tooLong);
const required = (max: number) => text(max).min(1, V.required);
/** "www.promotora.es" is accepted and saved as "https://www.promotora.es". */
const withScheme = (v: string) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v);

/**
 * Public "Para promotoras" form (/promotoras). Shared by the form and its server action.
 * Becomes a pending application with accountType "developer" in the same collection as agency applications.
 * Error messages are panel.validation keys, translated by FormField.
 */
export const developerApplicationSchema = z.object({
  fullName: required(120),
  company: required(160),
  email: required(200).regex(RE.email, V.email),
  phone: required(30).regex(RE.phone, V.phone),
  website: required(200).transform(withScheme).refine(optionalMatch(RE.url), V.url),
  activeDevelopments: z.enum(ACTIVE_DEVELOPMENTS, { message: V.pickOne }),
  feedUrl: text(500).transform(withScheme).refine(optionalMatch(RE.url), V.url),
  message: text(DEVELOPER_MESSAGE_MAX),
  acceptTerms: z.boolean().refine((v) => v, V.acceptTerms),
  /** Spam trap: a hidden field people never see. Bots fill it in; the server then saves nothing. */
  faxNumber: z.string().max(200).optional(),
});

export type DeveloperApplicationInput = z.input<typeof developerApplicationSchema>;
