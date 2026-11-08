// lib/server/property-code.ts
// Every property gets a platform-wide code like "KT-4821", made by the server when the property is created.
// It is the main reference everywhere (panel, network search, client pages, XML exports, emails) and never changes.
// The agency's own reference stays as a second field (feed imports match on it).
import "server-only";
import { randomInt } from "node:crypto";
import { collections } from "@/lib/db";

// No I or O: they read like 1 and 0
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** "AA-1234": 2 letters + 4 digits (5.7 million combinations), random so it says nothing about how many exist. */
export function randomPropertyCode() {
  const l = () => LETTERS[randomInt(LETTERS.length)];
  return `${l()}${l()}-${String(randomInt(10000)).padStart(4, "0")}`;
}

export const PROPERTY_CODE_RE = /^[A-Z]{2}-\d{4}$/;

/**
 * `n` codes no property uses yet (and different from each other).
 * The unique index on `code` is the final guard if two requests pick the same code at the same moment.
 */
export async function uniquePropertyCodes(n: number): Promise<string[]> {
  const chosen = new Set<string>();
  for (let round = 0; chosen.size < n; round++) {
    if (round > 20) throw new Error("Could not find free property codes");
    const candidates = new Set<string>();
    while (candidates.size < n - chosen.size) {
      const c = randomPropertyCode();
      if (!chosen.has(c)) candidates.add(c);
    }
    const taken = new Set(
      (await collections.properties.find({ code: { $in: [...candidates] } }, { projection: { code: 1 } }).toArray()).map((d) => d.code)
    );
    for (const c of candidates) if (!taken.has(c)) chosen.add(c);
  }
  return [...chosen];
}
