// app/api/admin/locations/import/route.ts
// POST: imports the location data again (provinces, municipalities, urbanisations) and re-maps every
// property's province / town ids. Admins only. It also runs by itself after a deploy that changes
// LOCATION_DATA_VERSION (lib/server/locations.ts); this is for running it on demand. Repeating it never duplicates.
import { fail, ok } from "@/lib/server/action-result";
import { adminOrNull } from "@/lib/server/admin/current-admin";
import { importLocations } from "@/lib/server/locations";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // a first import writes ~31,000 records

export async function POST() {
  if (!(await adminOrNull())) return Response.json(fail("unauthorized"), { status: 401 });
  try {
    return Response.json(ok(await importLocations()));
  } catch (err) {
    console.error("[locations import]", err);
    return Response.json(fail("server_error"), { status: 500 });
  }
}
