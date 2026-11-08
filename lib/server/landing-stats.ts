// lib/server/landing-stats.ts
// Live counters for the public landing page (Colabora MLS). Same rule as the public listings, cached for 10 minutes.
import "server-only";
import { unstable_cache } from "next/cache";
import { collections } from "@/lib/db";
import { blockedAgencyIds, publicFilter } from "@/lib/server/network";

export type LandingStats = {
  /** Agencies (not suspended / cancelled) with at least one property shared on the network. */
  memberAgencies: number;
  /** Properties shared on the network right now. */
  sharedProperties: number;
};

async function readStats(): Promise<LandingStats> {
  const query = publicFilter(await blockedAgencyIds());
  const [agencyIds, sharedProperties] = await Promise.all([
    collections.properties.distinct("agencyId", query),
    collections.properties.countDocuments(query),
  ]);
  return { memberAgencies: agencyIds.length, sharedProperties };
}

const cachedStats = unstable_cache(readStats, ["landing-stats"], { revalidate: 600 });

/** Never breaks the page: if the database can't be reached the counters are just not shown. */
export async function getLandingStats(): Promise<LandingStats> {
  try {
    return await cachedStats();
  } catch (e) {
    console.error("getLandingStats failed", e);
    return { memberAgencies: 0, sharedProperties: 0 };
  }
}
