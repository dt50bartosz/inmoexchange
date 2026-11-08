import type { ObjectId } from "mongodb";

/** view = detail opened; contact = "Show contact" in the network; whatsapp_click = "Book a viewing on WhatsApp". */
export type PropertyEventType = "view" | "contact" | "whatsapp_click";

/** network = another agency in the panel search; microsite = a client page (/p/<token>); public = /listings/<code>. */
export type PropertyEventSource = "network" | "microsite" | "public";

/**
 * Someone looked at a property or clicked to contact about it (collection "property_events").
 * One document per type, property, visitor and day: repeat events on the same day only move `lastAt`.
 * The owner agency's own views are never stored.
 */
export interface PropertyEventDoc {
  _id: ObjectId;
  type: PropertyEventType;
  /** Where it happened (the first source that day, if the same visitor came through several). */
  source: PropertyEventSource;
  propertyId: string;
  /** Code (or reference) at the time of the event, so lists can show it after the property is deleted. */
  reference: string;
  /** The agency that owns the property: whose stats this is. */
  ownerAgencyId: string;
  /** The logged-in agency that viewed it; null for anonymous visitors (clients, public). */
  viewerAgencyId: string | null;
  /** On client pages: the agency whose page it is (may differ from the owner for partner properties). */
  micrositeAgencyId: string | null;
  /**
   * Who, for "once per day": "a:<agencyId>" for logged-in agencies, "v:<hash>" for anonymous visitors.
   * The hash is HMAC(AUTH_SECRET, IP + browser + day): it changes every day and the IP is never stored.
   */
  visitorKey: string;
  day: string; // YYYY-MM-DD, Europe/Madrid
  createdAt: Date; // first event that day
  lastAt: Date; // latest event that day
}

/**
 * Views and WhatsApp clicks, last 30 days and all time, keyed by property id ("Mis propiedades", admin
 * properties) or by agency id (admin agencies). One view = one visitor on one day. Ids without events are missing.
 */
export type PropertyStatsSummary = Record<string, { views: number; views30: number; whatsapp: number; whatsapp30: number }>;

/** A count over the last 7 days, the last 30 days and all time (Madrid days, today included). */
export type StatPeriods = { d7: number; d30: number; all: number };

/** One measure (views or WhatsApp clicks) of one property, per source and in total. */
export type StatBreakdown = { total: StatPeriods; bySource: Record<PropertyEventSource, StatPeriods> };

/** The stats card on the property edit page. */
export type PropertyStats = {
  views: StatBreakdown;
  whatsapp: StatBreakdown;
  /** Views per day for the last 30 days, oldest first, days without views included (0). */
  daily: { day: string; views: number }[];
};

/** An agency that viewed the current agency's properties, for the panel dashboard. */
export type DashboardViewer = {
  id: string;
  name: string;
  logo: string | null;
  views: number;
  lastPropertyRef: string;
  lastViewedAt: string; // ISO
};

export type PanelDashboard = {
  activeCount: number;
  viewsCount: number;
  contactsCount: number;
  viewers: DashboardViewer[];
};
