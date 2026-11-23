// app/[locale]/admin/legal/server/actions.ts
"use server";

import { fail, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { recordAdminEvent } from "@/lib/server/platform-events";
import { deleteDraft, isLegalDocKey, publishDraft, saveDraft, startDraft } from "@/lib/server/legal-docs";
import { LEGAL_DOCS } from "@/lib/constants/legal-docs";
import type { LegalDocVersion } from "@/types/legal";

/* Admin → Legal: drafts and publishing of the versioned legal documents. Every change is in Admin → Activity. */

const writerOf = (admin: { id: string; email: string }) => ({ userId: admin.id, email: admin.email });

export async function startLegalDraftAction(key: string): Promise<ActionResult<LegalDocVersion, "draft_exists" | "not_found">> {
  const admin = await requireAdmin();
  if (!isLegalDocKey(key)) return fail("not_found");
  return startDraft(key, writerOf(admin));
}

export async function saveLegalDraftAction(id: string, input: unknown): Promise<ActionResult<LegalDocVersion, "validation_error" | "not_found" | "version_taken">> {
  const admin = await requireAdmin();
  const res = await saveDraft(id, input, writerOf(admin));
  if (res.ok) await recordAdminEvent(admin, "legal_draft_saved", null, `${LEGAL_DOCS[res.data.key].label}: draft ${res.data.version} saved`);
  return res;
}

export async function publishLegalDraftAction(id: string): Promise<ActionResult<LegalDocVersion, "not_found" | "empty">> {
  const admin = await requireAdmin();
  const res = await publishDraft(id, writerOf(admin));
  if (res.ok)
    await recordAdminEvent(
      admin,
      "legal_published",
      null,
      `${LEGAL_DOCS[res.data.key].label}: version ${res.data.version} published${res.data.material ? " (material change)" : ""}${res.data.changeNote ? `: ${res.data.changeNote}` : ""}`
    );
  return res;
}

export async function deleteLegalDraftAction(id: string): Promise<ActionResult<{ key: string }, "not_found">> {
  await requireAdmin();
  return deleteDraft(id);
}
