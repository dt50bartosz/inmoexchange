import { PASSWORD_MIN } from "@/lib/schemas/security";

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

/** Rough client-side estimate. The server must still enforce the real rules. */
export function passwordStrength(pw: string): StrengthScore {
  let score = 0;
  if (pw.length >= PASSWORD_MIN) score++;
  if (pw.length >= 14) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < PASSWORD_MIN) score = Math.min(score, 1);
  return Math.min(score, 4) as StrengthScore;
}
