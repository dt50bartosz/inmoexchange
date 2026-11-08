// app/[locale]/admin/promotores/promociones/new/page.tsx
import { connection } from "next/server";
import DeveloperPicker from "@/components/admin/developers/DeveloperPicker";
import { listDeveloperOptions } from "@/lib/server/admin/developments";

/** New development, step 1: choose (or create) the developer. Step 2 is /admin/promotores/[id]/promociones/new. */
export default async function Page() {
  await connection(); // always read fresh data, never prerender at build
  return <DeveloperPicker developers={await listDeveloperOptions()} />;
}
