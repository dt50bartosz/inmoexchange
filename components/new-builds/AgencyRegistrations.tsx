import { getFormatter, getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AgencyRegistration } from "@/lib/server/new-builds";

/** The agency's own client registrations and the developer's answer. `showDevelopment`: link each to its development. */
export default async function AgencyRegistrations({ registrations, showDevelopment = false }: { registrations: AgencyRegistration[]; showDevelopment?: boolean }) {
  const t = await getTranslations("newBuilds.registrations");
  const format = await getFormatter();
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });

  if (!registrations.length) return <p className="text-sm text-muted-foreground">{t("empty")}</p>;

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {registrations.map((r) => (
        <li key={r.id} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{r.buyer.name}</p>
            {r.status === "pending" && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">{t("pending")}</span>}
            {r.status === "rejected" && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{t("rejected")}</span>}
            {r.status === "accepted" &&
              (r.protectionActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                  <ShieldCheck aria-hidden className="size-3.5" />
                  {t("protectedUntil", { date: date(r.protectedUntil!) })}
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{t("expired")}</span>
              ))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[r.buyer.phone, r.buyer.email].filter(Boolean).join(" · ")} · {t("sentOn", { date: date(r.createdAt) })}
            {showDevelopment && (
              <>
                {" · "}
                <Link href={`/panel/obra-nueva/${r.developmentId}`} className="text-brand-light underline-offset-2 hover:underline">
                  {r.developmentName}
                </Link>
              </>
            )}
          </p>
          {r.status === "rejected" && r.reason && (
            <p className="mt-1 text-sm">{r.reason === "protected_other" ? t("protectedOther") : t("reason", { reason: r.reason })}</p>
          )}
          {r.status === "accepted" && r.reason && <p className="mt-1 text-sm">{t("note", { reason: r.reason })}</p>}
        </li>
      ))}
    </ul>
  );
}
