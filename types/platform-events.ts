// types/platform-events.ts
// Admin → Activity: the platform-wide log (lib/server/platform-events.ts).
import type { ObjectId } from "mongodb";
import type { UserRole } from "./models";

export const PLATFORM_EVENT_TYPES = [
  "login",
  "login_refused",
  "account_created",
  "application_approved",
  "application_rejected",
  "status_changed",
  "account_deleted",
  "account_converted",
  "login_details_sent",
  "login_email_changed",
  "signed_out_everywhere",
  "property_hidden",
  "property_unhidden",
  "legal_draft_saved",
  "legal_published",
  "lead_deleted",
] as const;
export type PlatformEventType = (typeof PLATFORM_EVENT_TYPES)[number];

export const PLATFORM_EVENT_LABELS: Record<PlatformEventType, string> = {
  login: "Login",
  login_refused: "Login refused",
  account_created: "Account created",
  application_approved: "Application approved",
  application_rejected: "Application rejected",
  status_changed: "Status changed",
  account_deleted: "Account deleted",
  account_converted: "Agency ⇄ developer",
  login_details_sent: "Login details sent",
  login_email_changed: "Login email changed",
  signed_out_everywhere: "Signed out everywhere",
  property_hidden: "Property hidden",
  property_unhidden: "Property unhidden",
  legal_draft_saved: "Legal draft saved",
  legal_published: "Legal document published",
  lead_deleted: "Developer call contact deleted",
};

export type PlatformOrgType = "agency" | "developer";

export interface PlatformEventDoc {
  _id: ObjectId;
  type: PlatformEventType;
  /** The agency or developer it is about; null for admin logins and rejected applications. */
  orgId: string | null;
  /** Name at the time, so the entry still reads well after the account is deleted. */
  orgName: string;
  orgType: PlatformOrgType | null;
  /** Who did it. */
  actor: { role: UserRole; userId: string; email: string };
  description: string;
  createdAt: Date;
}

export type PlatformEvent = Omit<PlatformEventDoc, "_id" | "createdAt"> & { id: string; createdAt: string };
