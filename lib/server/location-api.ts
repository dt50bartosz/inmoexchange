// lib/server/location-api.ts
// Shared by the location autocomplete endpoints (app/api/locations/*): rate limit, the usual
// ok() / fail() body, and no internal details in errors.
import "server-only";
import { fail, ok } from "@/lib/server/action-result";
import { consumeRateLimit } from "@/lib/server/rate-limit";

/** Generous: typing sends about one request per pause, and the search page and /listings are public. */
const PER_MINUTE = 120;

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function locationResponse(req: Request, run: (params: Record<string, string>) => Promise<unknown | { error: string; status: number; fieldErrors?: Record<string, string> }>) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await consumeRateLimit(`locations:${ip}`, PER_MINUTE, 60))) return json(fail("rate_limited"), 429, { "Retry-After": "60" });

    const params = Object.fromEntries(new URL(req.url).searchParams);
    const result = await run(params);
    if (result && typeof result === "object" && "error" in result && "status" in result) {
      const { error, status, fieldErrors } = result as { error: string; status: number; fieldErrors?: Record<string, string> };
      return json(fail(error, fieldErrors), status);
    }
    // Location data only changes with a deploy: browsers may reuse an answer for a few minutes
    return json(ok(result), 200, { "Cache-Control": "public, max-age=300" });
  } catch (err) {
    console.error("[locations api]", err);
    return json(fail("server_error"), 500);
  }
}
