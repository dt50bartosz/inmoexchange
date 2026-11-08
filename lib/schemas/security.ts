import { z } from "zod";
import { RE, V } from "./shared";

export const PASSWORD_MIN = 10;

export const passwordChangeSchema = z
  .object({
    current: z.string().min(1, V.required),
    next: z.string().min(PASSWORD_MIN, V.passwordMin),
    confirm: z.string().min(1, V.required),
  })
  .refine((v) => v.next !== v.current, { path: ["next"], message: V.passwordSame })
  .refine((v) => v.confirm === v.next, { path: ["confirm"], message: V.passwordMatch });
export type PasswordChangeValues = z.input<typeof passwordChangeSchema>;

/** Built per request because it compares against the current login email. */
export const emailChangeSchema = (currentEmail: string) =>
  z.object({
    newEmail: z
      .string()
      .trim()
      .min(1, V.required)
      .regex(RE.email, V.email)
      .refine((v) => v.toLowerCase() !== currentEmail.toLowerCase(), V.sameEmail),
    password: z.string().min(1, V.required),
  });
export type EmailChangeValues = z.input<ReturnType<typeof emailChangeSchema>>;
