// app/[locale]/admin/promotores/[id]/registros/page.tsx
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import AdminPage from "@/components/admin/ui/AdminPage";
import EnglishOnly from "@/components/admin/ui/EnglishOnly";
import RegistrationsList from "@/components/developer/RegistrationsList";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { REGISTRATION_STATUSES, type RegistrationStatus } from "@/lib/constants/developers";
import { loadAdminDeveloper } from "@/lib/server/admin/developments";
import { listDeveloperRegistrations, registrationCounts } from "@/lib/server/developer/registrations";
import { decideRegistrationAction } from "./server/actions";

const LABELS: Record<RegistrationStatus, string> = { pending: "Pending", accepted: "Accepted", rejected: "Rejected" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ estado?: string }> };

/** The developer's client registrations (what it sees: the buyer's name, not their contact details), decided on its behalf. */
export default async function Page({ params, searchParams }: Props) {
  await connection(); // always read fresh data, never prerender at build
  const { id } = await params;
  const developer = await loadAdminDeveloper(id);
  const { estado } = await searchParams;
  const status = REGISTRATION_STATUSES.includes(estado as RegistrationStatus) ? (estado as RegistrationStatus) : undefined;
  const [registrations, counts] = await Promise.all([listDeveloperRegistrations(id, { status }), registrationCounts(id)]);
  const total = counts.pending + counts.accepted + counts.rejected;
  const filters = [{ key: undefined, label: `All (${total})` }, ...REGISTRATION_STATUSES.map((s) => ({ key: s, label: `${LABELS[s]} (${counts[s]})` }))];

  return (
    <AdminPage
      title="Client registrations"
      description={`Clients agencies registered with ${developer.name}. Normally the developer accepts or rejects them in its panel; a decision here is recorded as made by Colabora MLS.`}
      back={
        <Link href={ADMIN_ROUTES.developer(id)} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          {developer.name}
        </Link>
      }
    >
      <nav aria-label="Filter by status" className="mb-6">
        <ul className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = f.key === status;
            return (
              <li key={f.key ?? "all"}>
                <Link
                  href={ADMIN_ROUTES.developerRegistrations(id, f.key)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex rounded-full border px-3 py-1 text-sm ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  {f.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <EnglishOnly>
        <RegistrationsList registrations={registrations} decide={decideRegistrationAction.bind(null, id)} />
      </EnglishOnly>
    </AdminPage>
  );
}
