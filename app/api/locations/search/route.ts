// app/api/locations/search/route.ts
// GET /api/locations/search?q=tor&limit=8&offset=0
//   → { ok: true, data: { items: [{ id, name, type, provinceName, municipalityName, detail }], hasMore } }
// Location autocomplete for the property search (panel and public /listings): provinces, municipalities and
// places inside them, across Spain. Public data (INE, GeoNames), rate limited. Fewer than 2 letters → no items.
import { zodFieldErrors } from "@/lib/server/action-result";
import { locationResponse } from "@/lib/server/location-api";
import { searchLocations } from "@/lib/server/locations";
import { locationSearchSchema } from "@/lib/schemas/locations";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return locationResponse(req, async (params) => {
    const parsed = locationSearchSchema.safeParse(params);
    if (!parsed.success) return { error: "validation_error", status: 400, fieldErrors: zodFieldErrors(parsed.error) };
    return searchLocations(parsed.data.q, parsed.data.limit, parsed.data.offset);
  });
}
