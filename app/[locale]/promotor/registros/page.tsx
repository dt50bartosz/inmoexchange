// app/[locale]/promotor/registros/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import RegistrationsList from "@/components/developer/RegistrationsList";
import { REGISTRATION_STATUSES, type RegistrationStatus } from "@/lib/constants/developers";
import { requireRole } from "@/lib/server/auth/require-role";
import { listDeveloperRegistrations, registrationCounts } from "@/lib/server/developer/registrations";
import { decideRegistrationAction } from "./server/actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("registrations");
  return { title: t("title") };
}

type Props = { searchParams: Promise<{ estado?: string }> };

/** The logged-in developer's client registrations. ?estado=pending|accepted|rejected filters them. */
export default async function RegistrationsPage({ searchParams }: Props) {
  const { accountId } = await requireRole("developer");
  const t = await getTranslations("registrations");
  const { estado } = await searchParams;
  const status = REGISTRATION_STATUSES.includes(estado as RegistrationStatus) ? (estado as RegistrationStatus) : undefined;
  const [registrations, counts] = await Promise.all([listDeveloperRegistrations(accountId, { status }), registrationCounts(accountId)]);
  const total = counts.pending + counts.accepted + counts.rejected;

  const filters = [
    { key: undefined, label: t("filters.all", { count: total }) },
    ...REGISTRATION_STATUSES.map((s) => ({ key: s, label: t(`filters.${s}`, { count: counts[s] }) })),
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">{t("intro")}</p>
      </header>

      <nav aria-label={t("filters.label")}>
        <ul className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = f.key === status;
            return (
              <li key={f.key ?? "all"}>
                <Link
                  href={f.key ? `/promotor/registros?estado=${f.key}` : "/promotor/registros"}
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

      <RegistrationsList registrations={registrations} decide={decideRegistrationAction} />
    </div>
  );
}
