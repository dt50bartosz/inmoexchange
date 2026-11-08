import CrmPanel from "@/components/crm/CrmPanel";
import { ClientPagesProvider } from "@/components/client-pages/ClientPagesProvider";
import { getContacts } from "./server/actions";
import { getClientPages } from "../client-pages/server/actions";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const [contacts, pages] = await Promise.all([getContacts(), getClientPages()]);
  return (
    // The buyer drawer links to each buyer's client page
    <ClientPagesProvider pages={pages.ok ? pages.data : []}>
      <CrmPanel initialContacts={contacts.ok ? contacts.data : []} />
    </ClientPagesProvider>
  );
}
