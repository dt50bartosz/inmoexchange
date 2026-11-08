"use client";

import { ArrowLeft } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import ProjectForm from "@/components/developers/ProjectForm";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { createAdminDocumentUploadUrls, createAdminUploadUrls } from "@/lib/actions/upload";
import type { Project } from "@/types/developers";
import { createProjectAction, updateProjectAction } from "@/app/[locale]/admin/promotores/server/actions";
import AdminPage from "../ui/AdminPage";
import AdminDevelopmentShell from "./AdminDevelopmentShell";

type Props = { developer: { id: string; name: string }; project: Project | null; unitCount: number };

/**
 * Admin → developer → add / edit a development: the developer's own form (same schema, same save helper), saved
 * with source "admin" (history, createdBy / updatedBy). A new one starts as a draft; Publish is in the header.
 */
export default function AdminProjectFormPage({ developer, project, unitCount }: Props) {
  const router = useRouter();
  const backHref = project ? ADMIN_ROUTES.project(developer.id, project.id) : ADMIN_ROUTES.developer(developer.id, "projects");

  const form = (
    <ProjectForm
      project={project}
      requestUrls={createAdminUploadUrls}
      requestDocumentUrls={createAdminDocumentUploadUrls}
      cancelHref={backHref}
      submit={(values, units) => (project ? updateProjectAction(project.id, values) : createProjectAction(developer.id, values, units))}
      onSaved={(saved) => {
        router.push(ADMIN_ROUTES.project(developer.id, saved.id));
        router.refresh();
      }}
    />
  );

  if (project)
    return (
      <AdminDevelopmentShell developer={developer} project={project} unitCount={unitCount}>
        {form}
      </AdminDevelopmentShell>
    );

  return (
    <AdminPage
      title="New development"
      description={`For ${developer.name}. It is saved as a draft (agencies don't see it) and shows “Added by Colabora MLS” to the developer. Publish it when it's ready.`}
      back={
        <Link href={backHref} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          {developer.name}
        </Link>
      }
    >
      {form}
    </AdminPage>
  );
}
