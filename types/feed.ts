import type { ObjectId } from "mongodb";
import type { FeedStatus } from "@/lib/schemas/feed";

/** A feed as stored in MongoDB (collection "feeds"). The browser uses `Feed` from lib/schemas/feed. */
export interface FeedDoc {
  _id: ObjectId;
  agencyId: string;
  name: string;
  url: string;
  status: FeedStatus;
  propertyCount: number;
  lastSyncAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}