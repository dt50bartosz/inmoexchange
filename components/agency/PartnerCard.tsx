import AgencyAvatar from "./ui/AgencyAvatar";
import InfoRow from "./InfoRow";
import type { Agency } from "@/types/agent";

export default function PartnerCard({ agency }: { agency: Agency }) {
  const place = [agency.town, agency.province].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="flex items-center gap-4 border-b border-border p-5">
        <AgencyAvatar logoUrl={agency.logoUrl} name={agency.name} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{agency.name || "Agency name"}</p>
          {place && <p className="truncate text-sm text-muted-foreground">{place}</p>}
        </div>
      </div>

      <div className="space-y-4 p-5 text-sm">
        {agency.regions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agency.regions.map((r) => (
              <span key={r} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-primary-hover">
                {r}
              </span>
            ))}
          </div>
        )}
        <dl className="space-y-1.5">
          {agency.contactPerson && <InfoRow label="Contact" value={agency.contactPerson} />}
          {agency.phone && <InfoRow label="Phone" value={agency.phone} />}
          {agency.email && <InfoRow label="Email" value={agency.email} />}
          {agency.spokenLanguages.length > 0 && (
            <InfoRow label="Speaks" value={agency.spokenLanguages.join(", ")} />
          )}
          {agency.commission && <InfoRow label="Commission" value={agency.commission} />}
          {agency.founded && <InfoRow label="Since" value={agency.founded} />}
        </dl>
      </div>
    </div>
  );
}
