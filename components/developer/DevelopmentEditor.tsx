"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/security/ui/ConfirmDialog";
import ProjectForm from "@/components/developers/ProjectForm";
import { PROMOTOR_ROUTES } from "@/lib/constants/routes";
import { createDeveloperDocumentUploadUrls, createDeveloperUploadUrls } from "@/lib/actions/upload";
import type { Project } from "@/types/developers";
import {
  createDevelopmentAction,
  deleteDevelopmentAction,
  setDevelopmentVisibilityAction,
  updateDevelopmentAction,
} from "@/app/[locale]/promotor/promociones/server/actions";
import { AddedByPlatformBadge, VisibilityBadge } from "./DevelopmentBadges";
import DevelopmentTabs from "./DevelopmentTabs";

/** Promociones → new / edit: the shared development form, plus publish and delete. */
export default function DevelopmentEditor({ project, unitCount = 0 }: { project: Project | null; unitCount?: number }) {
  const t = useTranslations("promotor.developments");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /** "Publicar" on a new development: it was just saved as a draft; publish it, then open its page. */
  const publishNew = async (saved: Project) => {
    const res = await setDevelopmentVisibilityAction(saved.id, "published").catch(() => null);
    if (res?.ok) toast.success(t("published"));
    else if (res?.error === "incomplete") {
      // The form checks first; this only happens if the server sees it differently. The draft stays.
      const missing = Object.keys(res.fieldErrors ?? {}).map((f) => t(`missing.${f.split(".")[0]}` as "missing.images"));
      toast.error(t("incomplete", { missing: missing.join(", ") }));
    } else toast.error(t("errors.generic"));
    router.push(PROMOTOR_ROUTES.development(saved.id));
    router.refresh();
  };

  const setVisibility = async (visibility: "draft" | "published") => {
    if (!project) return;
    setBusy(true);
    try {
      const res = await setDevelopmentVisibilityAction(project.id, visibility);
      if (res.ok) {
        toast.success(visibility === "published" ? t("published") : t("unpublished"));
        router.refresh();
      } else if (res.error === "incomplete") {
        const missing = Object.keys(res.fieldErrors ?? {}).map((f) => t(`missing.${f.split(".")[0]}`));
        toast.error(t("incomplete", { missing: missing.join(", ") }));
      } else toast.error(t("errors.generic"));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!project) return;
    setBusy(true);
    const res = await deleteDevelopmentAction(project.id).catch(() => null);
    setBusy(false);
    setConfirmDelete(false);
    if (!res?.ok) return toast.error(t("errors.generic"));
    toast.success(t("deleted"));
    router.push(PROMOTOR_ROUTES.developments);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href={PROMOTOR_ROUTES.developments} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          {t("title")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{project ? project.name : t("new")}</h1>
            {project && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <VisibilityBadge visibility={project.visibility} />
                {project.createdBy?.role === "admin" ? <AddedByPlatformBadge /> : project.updatedBy?.role === "admin" && <AddedByPlatformBadge edited />}
              </div>
            )}
          </div>
          {project && (
            <div className="flex flex-wrap gap-2">
              {project.visibility === "draft" ? (
                <Button type="button" disabled={busy} onClick={() => setVisibility("published")}>
                  <Eye aria-hidden className="size-4" />
                  {t("publish")}
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled={busy} onClick={() => setVisibility("draft")}>
                  <EyeOff aria-hidden className="size-4" />
                  {t("unpublish")}
                </Button>
              )}
              <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden className="size-4" />
                {t("delete")}
              </Button>
            </div>
          )}
        </div>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{project?.visibility === "published" ? t("publishedHint") : t("draftHint")}</p>
      </div>

      {project && <DevelopmentTabs base={PROMOTOR_ROUTES.development(project.id)} unitCount={unitCount} />}

      <ProjectForm
        project={project}
        cancelHref={PROMOTOR_ROUTES.developments}
        requestUrls={createDeveloperUploadUrls}
        requestDocumentUrls={createDeveloperDocumentUploadUrls}
        submit={(values, units) => (project ? updateDevelopmentAction(project.id, values) : createDevelopmentAction(values, units))}
        onPublish={project ? undefined : publishNew}
        onSaved={(saved, created) => {
          if (created) router.push(PROMOTOR_ROUTES.development(saved.id));
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t("deleteTitle")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      >
        <p>{t("deleteBody")}</p>
      </ConfirmDialog>
    </div>
  );
}
