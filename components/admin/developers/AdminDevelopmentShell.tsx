"use client";

import { useTransition, type ReactNode } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { VisibilityBadge } from "@/components/developer/DevelopmentBadges";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import type { AuditStamp, Project } from "@/types/developers";
import { setProjectVisibilityAction } from "@/app/[locale]/admin/promotores/server/actions";
import AdminPage from "../ui/AdminPage";
import { ProjectStatusBadge } from "./crm-ui";

const MISSING: Record<string, string> = { collaboration: "collaboration terms", images: "at least one photo", description: "a description" };
const by = (s: AuditStamp | null) => (!s ? "—" : s.role === "admin" ? "Colabora MLS (admin)" : s.role === "developer" ? "the developer" : "the system");

type Props = {
  developer: { id: string; name: string };
  project: Project;
  unitCount: number;
  /** Buttons next to Publish (e.g. Delete on the overview). */
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Admin → developer → one development: title, draft / published (with Publish / Back to draft), who added and last
 * changed it, and the Overview | Edit | Units tabs. Every page of the development (overview, edit, units) uses it.
 */
export default function AdminDevelopmentShell({ developer, project: p, unitCount, actions, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, startTransition] = useTransition();
  const base = ADMIN_ROUTES.project(developer.id, p.id);

  const setVisibility = (visibility: "draft" | "published") =>
    startTransition(async () => {
      const res = await setProjectVisibilityAction(developer.id, p.id, visibility).catch(() => null);
      if (res?.ok) {
        toast.success(visibility === "published" ? "Published: agencies can see it in Obra nueva." : "Back to draft: hidden from agencies.");
        router.refresh();
      } else if (res?.error === "incomplete") {
        const missing = [...new Set(Object.keys(res.fieldErrors ?? {}).map((f) => MISSING[f.split(".")[0]] ?? f))];
        toast.error(`Before publishing, add ${missing.join(", ")}.`);
      } else toast.error(res?.error === "not_found" ? "This development no longer exists." : "Something went wrong. Try again.");
    });

  const tabs = [
    { href: base, label: "Overview", active: pathname === base },
    { href: ADMIN_ROUTES.editProject(developer.id, p.id), label: "Edit", active: pathname.startsWith(`${base}/editar`) },
    { href: ADMIN_ROUTES.projectUnits(developer.id, p.id), label: `Units (${unitCount})`, active: pathname.startsWith(`${base}/unidades`) },
  ];

  return (
    <AdminPage
      title={p.name}
      description={`by ${developer.name}`}
      back={
        <Link href={ADMIN_ROUTES.developer(developer.id, "projects")} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          {developer.name}
        </Link>
      }
      actions={
        <>
          {p.visibility === "draft" ? (
            <Button type="button" disabled={busy} onClick={() => setVisibility("published")}>
              <Eye aria-hidden className="size-4" />
              Publish
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled={busy} onClick={() => setVisibility("draft")}>
              <EyeOff aria-hidden className="size-4" />
              Back to draft
            </Button>
          )}
          {actions}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <VisibilityBadge visibility={p.visibility} />
        <ProjectStatusBadge status={p.status} />
        <span className="text-muted-foreground">
          Added by {by(p.createdBy)} · last changed by {by(p.updatedBy)}
        </span>
      </div>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        {p.visibility === "draft"
          ? `Draft: only admins and the developer see it.${p.createdBy?.role === "admin" ? " The developer's panel shows a notice that Colabora MLS prepared it (no email is sent)." : ""}`
          : "Published: agencies see it in Obra nueva and can register clients."}
      </p>

      <nav aria-label="Development" className="mb-6 border-b">
        <ul className="flex gap-1">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={`-mb-px inline-block border-b-2 px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  tab.active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </AdminPage>
  );
}
