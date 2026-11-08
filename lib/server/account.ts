// lib/server/account.ts
// The logged-in user's own login: password, login email, sessions, and "forgot password".
// Shared by agencies (/panel/security) and admins (/admin/security). Server only.
import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import { auth, unstable_update } from "@/lib/auth";
import { collections } from "@/lib/db";
import {
  emailChangeEmail,
  emailChangeNoticeEmail,
  passwordChangedEmail,
  passwordResetEmail,
  sendEmail,
} from "@/lib/server/email";
import { hashLinkToken, hashPassword, linkToken, verifyPassword } from "@/lib/server/passwords";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import type { UserDoc } from "@/types/models";

const RESET_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_CHANGE_MS = 24 * 60 * 60 * 1000;

/** The logged-in user's document, or null. The user always comes from the session, never from the browser. */
export async function sessionUser(): Promise<UserDoc | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || !ObjectId.isValid(id)) return null;
  return collections.users.findOne({ _id: new ObjectId(id) });
}

/** What the Security page shows. */
export type SecurityInfo = { email: string; pendingEmail: string | null; passwordChangedAt: string };

export function toSecurityInfo(u: UserDoc): SecurityInfo {
  const pending = u.emailChange && u.emailChange.expiresAt > new Date() ? u.emailChange.newEmail : null;
  return { email: u.email, pendingEmail: pending, passwordChangedAt: (u.passwordChangedAt ?? u.createdAt).toISOString() };
}

/** New password + every other session signed out (sessionVersion +1). Keeps the current session working. */
async function setPassword(user: UserDoc, password: string, keepCurrentSession: boolean) {
  await collections.users.updateOne(
    { _id: user._id },
    {
      $set: { passwordHash: await hashPassword(password), passwordChangedAt: new Date(), mustChangePassword: false, passwordReset: null, updatedAt: new Date() },
      $inc: { sessionVersion: 1 },
    }
  );
  if (keepCurrentSession) await unstable_update({}); // re-reads the user into this session (lib/auth.ts)
  await sendEmail(passwordChangedEmail(user.email));
}

export async function changePassword(current: string, next: string): Promise<"ok" | "wrong_password" | "not_found" | "rate_limited"> {
  const user = await sessionUser();
  if (!user) return "not_found";
  if (!(await consumeRateLimit(`password:${user._id.toHexString()}`, 10, 15 * 60))) return "rate_limited";
  if (!user.passwordHash || !(await verifyPassword(user.passwordHash, current))) return "wrong_password";
  await setPassword(user, next, true);
  return "ok";
}

/** "Sign out of all other devices": sessions elsewhere stop working on their next click. */
export async function signOutEverywhere(): Promise<boolean> {
  const user = await sessionUser();
  if (!user) return false;
  await collections.users.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 }, $set: { updatedAt: new Date() } });
  await unstable_update({});
  return true;
}

/* ---------- Login email change: confirmed from a link sent to the new address ---------- */

export async function requestEmailChange(
  newEmail: string,
  password: string
): Promise<"ok" | "wrong_password" | "email_taken" | "not_found" | "email_failed" | "rate_limited"> {
  const user = await sessionUser();
  if (!user) return "not_found";
  if (!(await consumeRateLimit(`email-change:${user._id.toHexString()}`, 5, 60 * 60))) return "rate_limited";
  if (!user.passwordHash || !(await verifyPassword(user.passwordHash, password))) return "wrong_password";

  const email = newEmail.trim().toLowerCase();
  if (await collections.users.findOne({ email }, { projection: { _id: 1 } })) return "email_taken";

  const { token, tokenHash } = linkToken();
  await collections.users.updateOne(
    { _id: user._id },
    { $set: { emailChange: { newEmail: email, tokenHash, expiresAt: new Date(Date.now() + EMAIL_CHANGE_MS) }, updatedAt: new Date() } }
  );
  const sent = await sendEmail(emailChangeEmail(email, token));
  await sendEmail(emailChangeNoticeEmail(user.email, email));
  return sent === "sent" ? "ok" : "email_failed";
}

/** Sends the confirmation link again (a new one: only the hash of the old one was kept). */
export async function resendEmailChange(): Promise<"ok" | "not_found" | "email_failed" | "rate_limited"> {
  const user = await sessionUser();
  if (!user?.emailChange) return "not_found";
  if (!(await consumeRateLimit(`email-change:${user._id.toHexString()}`, 5, 60 * 60))) return "rate_limited";
  const { token, tokenHash } = linkToken();
  await collections.users.updateOne(
    { _id: user._id },
    { $set: { emailChange: { ...user.emailChange, tokenHash, expiresAt: new Date(Date.now() + EMAIL_CHANGE_MS) } } }
  );
  return (await sendEmail(emailChangeEmail(user.emailChange.newEmail, token))) === "sent" ? "ok" : "email_failed";
}

export async function cancelEmailChange(): Promise<boolean> {
  const user = await sessionUser();
  if (!user) return false;
  await collections.users.updateOne({ _id: user._id }, { $set: { emailChange: null, updatedAt: new Date() } });
  return true;
}

/** The link from the new address was used: that address becomes the login. Signs out every session. */
export async function confirmEmailChange(token: string): Promise<"ok" | "invalid" | "email_taken"> {
  if (typeof token !== "string" || token.length > 200) return "invalid";
  const user = await collections.users.findOne({ "emailChange.tokenHash": hashLinkToken(token), "emailChange.expiresAt": { $gt: new Date() } });
  if (!user?.emailChange) return "invalid";

  const email = user.emailChange.newEmail;
  try {
    await collections.users.updateOne(
      { _id: user._id },
      { $set: { email, emailChange: null, updatedAt: new Date() }, $inc: { sessionVersion: 1 } }
    );
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) return "email_taken"; // taken since the request
    throw err;
  }
  // An agency's login email is also kept on the agency (admin pages show it)
  if (user.agencyId && ObjectId.isValid(user.agencyId)) {
    await collections.agencies.updateOne({ _id: new ObjectId(user.agencyId) }, { $set: { email, updatedAt: new Date() } });
  }
  return "ok";
}

/* ---------- Forgot password ---------- */

/**
 * Emails a reset link if the email has a login. Always looks the same to the visitor,
 * so the form can't be used to find out which emails have an account.
 */
export async function requestPasswordReset(rawEmail: string, ip: string): Promise<"ok" | "rate_limited"> {
  const email = rawEmail.trim().toLowerCase();
  if (!(await consumeRateLimit(`reset-ip:${ip}`, 10, 60 * 60))) return "rate_limited";
  if (!(await consumeRateLimit(`reset:${email}`, 3, 60 * 60))) return "ok"; // quietly: don't flood their inbox

  const user = await collections.users.findOne({ email });
  if (!user) return "ok";
  const { token, tokenHash } = linkToken();
  await collections.users.updateOne(
    { _id: user._id },
    { $set: { passwordReset: { tokenHash, expiresAt: new Date(Date.now() + RESET_MS) }, updatedAt: new Date() } }
  );
  await sendEmail(passwordResetEmail(email, token));
  return "ok";
}

/** Whether a reset link can still be used (for the page, before the form is shown). */
export async function resetTokenIsValid(token: string) {
  if (typeof token !== "string" || token.length > 200) return false;
  return !!(await collections.users.findOne(
    { "passwordReset.tokenHash": hashLinkToken(token), "passwordReset.expiresAt": { $gt: new Date() } },
    { projection: { _id: 1 } }
  ));
}

/** Sets the new password from a reset link (once). Every session is signed out; the user logs in again. */
export async function resetPassword(token: string, password: string): Promise<"ok" | "invalid"> {
  if (typeof token !== "string" || token.length > 200) return "invalid";
  const user = await collections.users.findOne({ "passwordReset.tokenHash": hashLinkToken(token), "passwordReset.expiresAt": { $gt: new Date() } });
  if (!user) return "invalid";
  await setPassword(user, password, false);
  return "ok";
}
