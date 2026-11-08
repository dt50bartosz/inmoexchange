"use client";

import { useState, useTransition } from "react";
import { ExternalLink, MapPin, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import LocalTime from "@/components/developers/LocalTime";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import type { Activity, DeveloperNote, Project } from "@/types/developers";
import { addManualUpdateAction, deleteProjectAction } from "@/app/[locale]/admin/promotores/server/actions";
import ConfirmDialog from "../ui/ConfirmDialog";
import AdminDevelopmentShell from "./AdminDevelopmentShell";
import { ActivityTimeline, FreshnessCell, InfoCard, Row, priceRange, range } from "./crm-ui";
import DeveloperNotes from "./DeveloperNotes";

type Props = {
  project: Project;
  developer: { id: string; name: string };
  unitCount: number;
  /** Client registrations by agencies for this development. */
  registrationCount: number;
  activity: Activity[];
  notes: DeveloperNote[];
};

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 truncate font-semibold">{children}</div>
    </div>
  );
}

export default function ProjectDetail({ project: p, developer, unitCount, registrationCount, activity, notes }: Props) {
  const router = useRouter();
  const tt = useTranslations("panel.properties.types");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [update, setUpdate] = useState("");
  const [busy, startTransition] = useTransition();
  const mapsHref = p.mapsUrl || (p.latitude !== null && p.longitude !== null ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}` : "");

  const remove = () =>
    startTransition(async () => {
      const res = await deleteProjectAction(p.id).catch(() => null);
      if (!res?.ok) {
        toast.error(res?.error === "not_found" ? "This project no longer exists." : "Couldn't delete the project. Try again.");
        return;
      }
      toast.success(`${p.name} deleted.`);
      router.push(ADMIN_ROUTES.developer(developer.id, "projects"));
    });

  const addUpdate = () =>
    startTransition(async () => {
      const res = await addManualUpdateAction(p.id, { description: update }).catch(() => null);
      if (!res?.ok) {
        toast.error(res?.error === "validation_error" ? "Write the update first (up to 1,000 characters)." : "Couldn't add the update. Try again.");
        return;
      }
      setUpdate("");
      toast.success("Update added to the history.");
      router.refresh();
    });

  return (
    <AdminDevelopmentShell
      developer={developer}
      project={p}
      unitCount={unitCount}
      actions={
        <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={() => setConfirmDelete(true)}>
          <Trash2 aria-hidden className="size-4" />
          Delete
        </Button>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Location">{[p.town, p.province].filter(Boolean).join(", ") || "—"}</Stat>
        <Stat label="Client registrations">
          <Link href={ADMIN_ROUTES.developerRegistrations(developer.id)} className="tabular-nums hover:underline">
            {registrationCount}
          </Link>
        </Stat>
        <Stat label="Last updated">
          <FreshnessCell iso={p.lastUpdateAt} days={p.daysSinceUpdate} freshness={p.freshness} />
        </Stat>
        <Stat label="Properties">
          <span className="tabular-nums">{p.unitsTotal ?? "—"}</span>
          <Link href={ADMIN_ROUTES.projectUnits(developer.id, p.id)} className="block text-xs font-normal text-muted-foreground hover:underline">
            {p.unitsAvailable !== null ? `${p.unitsAvailable} available · ` : ""}
            {p.summarySource === "units" ? `from ${unitCount} units` : unitCount ? `${unitCount} units` : "declared"}
          </Link>
        </Stat>
        <Stat label="Starting price">{p.priceFrom !== null ? priceRange(p.priceFrom, null, p.currency).replace("from ", "") : "—"}</Stat>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid min-w-0 content-start gap-6">
          <InfoCard title="Project information">
            <dl>
              <Row label="Property types" value={p.propertyTypes.map((t) => tt(t)).join(", ")} />
              <Row label="Price range" value={priceRange(p.priceFrom, p.priceTo, p.currency)} />
              <Row label="Bedrooms" value={range(p.bedroomsMin, p.bedroomsMax)} />
              <Row label="Address" value={[p.address, p.town, p.province, p.country].filter(Boolean).join(", ")} />
              <Row
                label="Map"
                value={
                  mapsHref && (
                    <a href={mapsHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                      <MapPin aria-hidden className="size-3.5" />
                      {p.latitude !== null ? `${p.latitude}, ${p.longitude}` : "Google Maps"}
                      <ExternalLink aria-hidden className="size-3" />
                    </a>
                  )
                }
              />
              <Row label="Expected completion" value={p.expectedCompletion && <LocalTime iso={`${p.expectedCompletion}T12:00:00Z`} mode="date" />} />
              <Row label="Actual completion" value={p.actualCompletion && <LocalTime iso={`${p.actualCompletion}T12:00:00Z`} mode="date" />} />
              <Row label="Created" value={<LocalTime iso={p.createdAt} />} />
              <Row label="Last change saved" value={<LocalTime iso={p.updatedAt} />} />
            </dl>
          </InfoCard>

          <InfoCard title={`Images (${p.images.length})`}>
            {p.images.length === 0 ? (
              <p className="text-sm text-muted-foreground">No images yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {p.images.map((img) => (
                  <li key={img.id} className={`overflow-hidden rounded-lg border ${img.id === p.mainImageId ? "ring-2 ring-primary" : ""}`}>
                    <a href={img.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </InfoCard>

          <InfoCard title="Description">
            {p.description.es || p.description.en ? (
              <div className="grid gap-3 text-sm">
                {(["es", "en"] as const).map(
                  (lang) =>
                    p.description[lang] && (
                      <div key={lang} lang={lang}>
                        <p className="text-xs font-medium uppercase text-muted-foreground">{lang === "es" ? "Spanish" : "English"}</p>
                        <p className="whitespace-pre-line">{p.description[lang]}</p>
                      </div>
                    )
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No description yet.</p>
            )}
          </InfoCard>
        </div>

        <div className="grid min-w-0 content-start gap-6">
          <InfoCard title="Update history">
            <form
              className="mb-5 grid gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addUpdate();
              }}
            >
              <label htmlFor="manual-update" className="text-sm font-medium">
                Add a manual update
              </label>
              <Textarea id="manual-update" rows={2} maxLength={1000} value={update} onChange={(e) => setUpdate(e.target.value)} placeholder="e.g. Phase 2 launched on site, confirmed by phone" />
              <Button type="submit" size="sm" className="justify-self-start" disabled={busy || !update.trim()}>
                Add to history
              </Button>
            </form>
            <ActivityTimeline items={activity} filterable />
          </InfoCard>

          <InfoCard title="Internal notes">
            <DeveloperNotes developerId={developer.id} notes={notes} fixedProjectId={p.id} />
          </InfoCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${p.name}?`}
        description={registrationCount > 0 ? `Agencies have registered ${registrationCount} client${registrationCount === 1 ? "" : "s"} for it: consider “Back to draft” instead. Deleting removes the development, its units, images, documents and notes; the update history is kept.` : "The development, its units, images, documents and notes are deleted. The update history is kept."}
        confirmLabel="Delete project"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          remove();
        }}
      />
    </AdminDevelopmentShell>
  );
}
