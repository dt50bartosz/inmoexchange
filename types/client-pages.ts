import type { ObjectId } from "mongodb";
import type { PropertyType } from "@/types/properties";
import type { Property as FullProperty } from "@/lib/schemas/property";

export type { PropertyType };

/** A property as the AGENT sees it while building a client page (own or a partner's). */
export interface Property {
  id: string;
  ref: string;
  title: string;
  town: string;
  type: PropertyType;
  condition: FullProperty["condition"];
  price: number;
  bedrooms: number;
  bathrooms: number;
  builtM2: number;
  plotM2?: number;
  features: string[];
  image?: string;
  /** "own" = this agency's listing, "network" = shared by another agency. */
  source: "own" | "network";
  /** Only for network listings. Visible to the agent, never to the client. */
  listingAgency?: string;
}

export type Reaction = "liked" | "rejected";

export interface ShortlistItem {
  propertyId: string;
  agentComment: string;
  addedAt: string;
  // Filled in by the client on their page
  reaction?: Reaction;
  clientComment?: string;
  viewingRequestedAt?: string;
  /** False until the agent has opened the editor after the client reacted. */
  seenByAgent: boolean;
}

export type PageStatus = "live" | "paused";

/** A client page as the agent's panel uses it. */
export interface ClientPage {
  id: string;
  contactId: string;
  buyerName: string;
  buyerPhone?: string;
  /** Random secret in the public link /p/<token>. */
  token: string;
  status: PageStatus;
  expiresAt?: string; // YYYY-MM-DD
  welcomeMessage: string;
  createdAt: string;
  updatedAt: string;
  lastViewedAt?: string;
  viewCount: number;
  items: ShortlistItem[];
}

/** Collection "client_pages". Dates as Date; the panel gets ClientPage. */
export interface ClientPageDoc {
  _id: ObjectId;
  agencyId: string;
  contactId: string;
  buyerName: string;
  buyerPhone?: string;
  token: string;
  status: PageStatus;
  expiresAt?: string;
  welcomeMessage: string;
  createdAt: Date;
  updatedAt: Date;
  lastViewedAt?: Date;
  viewCount: number;
  items: {
    propertyId: string;
    agentComment: string;
    addedAt: Date;
    reaction?: Reaction;
    clientComment?: string;
    viewingRequestedAt?: Date;
    seenByAgent: boolean;
  }[];
}

/* ---------- The public page (/p/<token>): what the CLIENT gets ---------- */

/**
 * A property as the client sees it: with the platform code ("KT-4821"), but never the listing agency,
 * its contact details, the agency's own reference or (for partner properties) the address.
 */
export type PublicProperty = Pick<
  FullProperty,
  "id" | "code" | "type" | "condition" | "town" | "province" | "price" | "bedrooms" | "bathrooms" | "builtM2" | "plotM2" | "features" | "photos" | "description" | "energyRating"
> & {
  /** Street address, only for the agency's own properties when it doesn't hide it. */
  address: string;
  agentComment: string;
  reaction: Reaction | null;
  clientComment: string;
  viewingRequested: boolean;
};

/** The agency that made the page: the ONLY contact details on it. */
export type PublicAgency = {
  name: string;
  logoUrl: string | null;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
};

export type PublicClientPage = {
  buyerFirstName: string;
  welcomeMessage: string;
  agency: PublicAgency;
  properties: PublicProperty[];
};
