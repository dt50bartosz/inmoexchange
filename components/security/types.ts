import type { ActionResult } from "@/lib/server/action-result";

export type SecurityError =
  | "validation_error"
  | "not_found"
  | "wrong_password"
  | "email_taken"
  | "email_failed"
  | "rate_limited";

export type SecurityActionResult = ActionResult<null, SecurityError>;

/**
 * The server actions the Security page calls. The agency page and the admin page pass their own
 * (each checks its own role first), so the same components serve both.
 */
export type SecurityActions = {
  changePassword: (input: unknown) => Promise<SecurityActionResult>;
  requestEmailChange: (input: unknown) => Promise<SecurityActionResult>;
  resendEmailChange: () => Promise<SecurityActionResult>;
  cancelEmailChange: () => Promise<SecurityActionResult>;
  signOutEverywhere: () => Promise<SecurityActionResult>;
};
