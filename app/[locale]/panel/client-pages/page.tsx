// app/[locale]/panel/client-pages/page.tsx
import { Suspense } from "react";
import ClientPagesList from "@/components/client-pages/ClientPagesList";
import { getContacts } from "../crm/server/actions";
import { getClientPages } from "./server/actions";

export const metadata = { title: "Client pages" };
export const dynamic = "force-dynamic";

export default async function ClientPagesPage() {
  const [pages, contacts] = await Promise.all([getClientPages(), getContacts()]);
  return (
    <div className="h-[calc(100dvh-4rem)]">
      {/* Suspense is required because the list reads ?buyer= from the URL */}
      <Suspense>
        <ClientPagesList pages={pages.ok ? pages.data : []} contacts={contacts.ok ? contacts.data : []} />
      </Suspense>
    </div>
  );
}
