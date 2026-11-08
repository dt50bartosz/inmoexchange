// lib/server/admin/applications.ts
// Read helpers for Admin → Applications. Plain server functions: only server code can call them.
import "server-only";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import type { AgencyApplication, AgencyApplicationDoc } from "@/types/admin";
import type { AgencyDoc } from "@/types/models";
import { requireAdmin } from "./current-admin";

/** "ES9121000418450200051332" → "ES91 •••• 1332": enough to recognise it, never the full number in the browser. */
const maskIban = (iban: string) => (iban ? `${iban.slice(0, 4)} •••• ${iban.slice(-4)}` : "");

/**
 * Register form details of an application, as they go onto the agency when it is approved
 * (read from the database, never from the browser). Empty for applications from the old form.
 */
export function registrationForAgency(d: AgencyApplicationDoc): Partial<AgencyDoc> {
  if (!d.privacyAcceptedAt) return {};
  return {
    ...(d.accountType === "developer" ? { accountType: "developer" as const } : {}),
    preferredLanguage: d.preferredLanguage,
    raicv: d.raicv,
    website: d.website,
    street: d.street,
    province: d.province,
    postcode: d.postcode,
    ownerName: d.ownerName,
    ownerIdNumber: d.ownerIdNumber,
    phone2: d.phone2,
    email2: d.email2,
    crm: d.crm,
    crmAgencyNumber: d.crmAgencyNumber,
    billing: { paymentFrequency: d.paymentFrequency ?? "", iban: d.iban ?? "" },
    privacyAcceptedAt: d.privacyAcceptedAt,
  };
}

export function toApplication(d: AgencyApplicationDoc): AgencyApplication {
  return {
    id: d._id.toHexString(),
    agencyName: d.agencyName,
    legalName: d.legalName ?? "",
    cif: d.cif ?? "",
    contactPerson: d.contactPerson,
    email: d.email,
    phone: d.phone,
    town: d.town ?? "",
    regions: d.regions ?? [],
    feedUrl: d.feedUrl ?? "",
    areas: d.areas ?? "",
    registration: d.privacyAcceptedAt
      ? {
          preferredLanguage: d.preferredLanguage ?? "en",
          accountType: d.accountType ?? "agency",
          brandName: d.brandName ?? "",
          raicv: d.raicv ?? "",
          website: d.website ?? "",
          street: d.street ?? "",
          province: d.province ?? "",
          postcode: d.postcode ?? "",
          ownerName: d.ownerName ?? "",
          ownerIdNumber: d.ownerIdNumber ?? "",
          phone2: d.phone2 ?? "",
          email2: d.email2 ?? "",
          crm: d.crm ?? "",
          crmAgencyNumber: d.crmAgencyNumber ?? "",
          paymentFrequency: d.paymentFrequency ?? "",
          iban: maskIban(d.iban ?? ""),
          privacyAcceptedAt: d.privacyAcceptedAt.toISOString(),
        }
      : null,
    activeDevelopments: d.activeDevelopments ?? null,
    message: d.message ?? "",
    createdAt: d.createdAt.toISOString(),
    status: d.status,
    decidedAt: d.decidedAt?.toISOString() ?? null,
    rejectReason: d.rejectReason,
    agencyId: d.agencyId,
  };
}

/** All applications, newest first. */
export async function listApplications(): Promise<AgencyApplication[]> {
  await requireAdmin();
  const docs = await collections.applications.find().sort({ createdAt: -1 }).toArray();
  return docs.map(toApplication);
}

/** One application by id, or null. */
export async function findApplication(id: unknown) {
  await requireAdmin();
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  return collections.applications.findOne({ _id: new ObjectId(id) });
}
