import { z } from "zod";
import { V } from "./shared";
import { PASSWORD_MIN } from "./security";

/** Login: email + password. */
export const loginSchema = z.object({
  email: z.string().trim().min(1, V.required).email(V.email),
  password: z.string().min(1, V.required).max(200, V.tooLong),
});

/** First login: replace the temporary password from the email. */
export const newPasswordSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN, V.passwordMin).max(200, V.tooLong),
    confirm: z.string().min(1, V.required),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: V.passwordMatch });

export type LoginValues = z.input<typeof loginSchema>;
export type NewPasswordValues = z.input<typeof newPasswordSchema>;
