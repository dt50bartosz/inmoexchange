// app/[locale]/panel/client-pages/[id]/page.tsx
import { ObjectId } from "mongodb";
import ClientPageEditor from "@/components/client-pages/ClientPageEditor";
import { collections } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import { findContact, toContact } from "@/lib/server/crm";
import { availableProperties, scopedPage, toClientPage } from "@/lib/server/client-pages";

export const metadata = { title: "Edit client page" };
export const dynamic = "force-dynamic";

export default async function ClientPageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agencyId = await getAgencyId();
  const doc = ObjectId.isValid(id) ? await collections.clientPages.findOne(scopedPage(agencyId, new ObjectId(id))) : null;
  if (!doc) return <ClientPageEditor page={null} buyer={null} properties={[]} newIds={[]} />;

  // Reactions the agent hasn't seen yet are highlighted once, then marked as seen
  const newIds = doc.items
    .filter((i) => !i.seenByAgent && (i.reaction || i.clientComment || i.viewingRequestedAt))
    .map((i) => i.propertyId);
  if (newIds.length) {
    await collections.clientPages.updateOne({ _id: doc._id, agencyId }, { $set: { "items.$[].seenByAgent": true } });
  }

  const [contact, properties] = await Promise.all([
    findContact(doc.contactId),
    availableProperties(agencyId, doc.items.map((i) => i.propertyId)),
  ]);

  return (
    <div className="h-[calc(100dvh-4rem)]">
      <ClientPageEditor
        page={toClientPage(doc)}
        buyer={contact && !contact.deletedAt ? toContact(contact) : null}
        properties={properties}
        newIds={newIds}
      />
    </div>
  );
}
