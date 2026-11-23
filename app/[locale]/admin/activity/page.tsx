import { connection } from "next/server";
import ActivityLogPage from "@/components/admin/activity/ActivityLogPage";
import { ensureIndexes } from "@/lib/db";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { listPlatformEvents, PLATFORM_EVENTS_PAGE_SIZE } from "@/lib/server/platform-events";
import { PLATFORM_EVENT_TYPES, type PlatformEventType } from "@/types/platform-events";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const pick = (sp: Record<string, string | string[] | undefined>, key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");

/** Admin → Activity: logins and account events across every agency and developer (newest first, filtered on the server). */
export default async function Page({ searchParams }: Props) {
  await connection(); // always read fresh data, never prerender at build
  await requireAdmin();
  await ensureIndexes();
  const sp = await searchParams;
  const filters = {
    type: PLATFORM_EVENT_TYPES.includes(pick(sp, "type") as PlatformEventType) ? pick(sp, "type") : "",
    orgType: ["agency", "developer", "none"].includes(pick(sp, "org")) ? pick(sp, "org") : "",
    actor: ["admin", "agency", "developer"].includes(pick(sp, "by")) ? pick(sp, "by") : "",
    days: ["1", "7", "30", "90"].includes(pick(sp, "days")) ? pick(sp, "days") : "",
    q: pick(sp, "q").slice(0, 100),
  };
  const page = Math.max(1, Number.parseInt(pick(sp, "page"), 10) || 1);
  const { items, total } = await listPlatformEvents({ ...filters, days: filters.days ? Number(filters.days) : undefined }, page);
  return (
    <ActivityLogPage
      key={JSON.stringify(filters)}
      items={items}
      total={total}
      page={page}
      pageCount={Math.max(1, Math.ceil(total / PLATFORM_EVENTS_PAGE_SIZE))}
      filters={filters}
    />
  );
}
