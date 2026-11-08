import { z } from "zod";
import { PROPERTY_CONDITIONS } from "@/lib/constants/property";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i);

/** "Save and update page": the agent's part only. Client reactions are kept on the server. */
export const saveClientPageSchema = z.object({
  items: z
    .array(z.object({ propertyId: objectId, agentComment: z.string().trim().max(1000) }))
    .max(100),
  welcomeMessage: z.string().trim().max(2000),
  /** YYYY-MM-DD or "" for no end date. */
  expiresAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  status: z.enum(["live", "paused"]),
});

/** The editor's property search. */
export const poolFiltersSchema = z.object({
  text: z.string().trim().max(60).catch(""),
  priceMin: z.number().int().nonnegative().nullable().catch(null),
  priceMax: z.number().int().nonnegative().nullable().catch(null),
  bedsMin: z.number().int().min(0).max(10).catch(0),
  areas: z.array(z.string().trim().max(60)).max(30).catch([]),
  types: z.array(z.string().max(30)).max(20).catch([]),
  condition: z.enum(["all", ...PROPERTY_CONDITIONS]).catch("all"),
  source: z.enum(["all", "own", "network"]).catch("all"),
});

/** What the client can do on their page, one property at a time. */
export const clientReactionSchema = z.object({
  propertyId: objectId,
  reaction: z.enum(["liked", "rejected"]).nullable().optional(),
  clientComment: z.string().trim().max(1000).optional(),
  requestViewing: z.literal(true).optional(),
});
