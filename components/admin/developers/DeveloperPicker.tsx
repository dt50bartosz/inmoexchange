"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ChevronRight, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { EMPTY_COMPANY_PROFILE } from "@/lib/schemas/developer-profile";
import { RE } from "@/lib/schemas/shared";
import type { DeveloperOption } from "@/lib/server/admin/developments";
import { createDeveloperAction } from "@/app/[locale]/admin/promotores/server/actions";
import AdminPage from "../ui/AdminPage";
import { loginEmailToast } from "../ui/loginEmailToast";

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const STATUS: Record<string, string> = { pending: "Never logged in", suspended: "Suspended", cancelled: "Cancelled" };

/**
 * Admin → New development, step 1: which developer it is for. Search the developers, or create one on the spot
 * ("+ New developer": name and login email; the login email is only sent if you tick it), then the form opens.
 */
export default function DeveloperPicker({ developers }: { developers: DeveloperOption[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sendInvite, setSendInvite] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [busy, startTransition] = useTransition();

  const shown = useMemo(() => {
    const n = normalize(q.trim());
    return n ? developers.filter((d) => normalize(`${d.name} ${d.town} ${d.email}`).includes(n)) : developers;
  }, [developers, q]);

  const openNew = () => {
    setName(q.trim());
    setEmail("");
    setSendInvite(false);
    setErrors({});
    setOpen(true);
  };

  const create = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter the company name.";
    if (!RE.email.test(email.trim())) next.email = "Enter a valid email.";
    setErrors(next);
    if (next.name || next.email) return;
    startTransition(async () => {
      const res = await createDeveloperAction({ ...EMPTY_COMPANY_PROFILE, relationshipManagerId: "", name: name.trim(), email: email.trim(), sendInvite }).catch(() => null);
      if (!res?.ok) {
        if (res?.error === "email_taken") setErrors({ email: "Another login already uses this email." });
        else toast.error("Couldn't create the developer. Try again.");
        return;
      }
      toast.success(`${name.trim()} added. Now add its development.`);
      if (res.data.email !== "not_sent") loginEmailToast(email.trim(), res.data.email);
      setOpen(false);
      router.push(ADMIN_ROUTES.newProject(res.data.id));
    });
  };

  return (
    <AdminPage
      title="New development"
      description="Choose the developer it belongs to. It is saved as a draft on its behalf; you can publish it when it's ready."
      back={
        <Link href={ADMIN_ROUTES.projects} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          All projects
        </Link>
      }
      actions={
        <Button type="button" variant="outline" onClick={openNew}>
          <Plus aria-hidden className="size-4" />
          New developer
        </Button>
      }
    >
      <div className="max-w-2xl">
        <label htmlFor="developer-search" className="text-sm font-medium">
          Developer
        </label>
        <div className="relative mt-1.5">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="developer-search" type="search" className="pl-9" placeholder="Search by name, town or email" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" autoFocus />
        </div>

        <ul className="mt-3 divide-y rounded-xl border bg-card" aria-label="Developers">
          {shown.map((d) => (
            <li key={d.id}>
              <Link
                href={ADMIN_ROUTES.newProject(d.id)}
                className="flex items-center justify-between gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{d.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[d.town, d.email, STATUS[d.status]].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              {developers.length === 0 ? "No developers yet." : `No developer matches “${q.trim()}”.`}{" "}
              <button type="button" onClick={openNew} className="font-medium text-foreground underline">
                Create {q.trim() ? `“${q.trim()}”` : "one"}
              </button>
            </li>
          )}
        </ul>
      </div>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New developer</DialogTitle>
            <DialogDescription>The account is created now; complete its profile later from the developer's page.</DialogDescription>
          </DialogHeader>
          <form
            id="new-developer"
            noValidate
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <label className="grid gap-1.5 text-sm font-medium">
              Company name
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-invalid={!!errors.name} aria-describedby={errors.name ? "nd-name-error" : undefined} />
              {errors.name && (
                <span id="nd-name-error" className="text-xs font-normal text-destructive">
                  {errors.name}
                </span>
              )}
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Login email
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" aria-invalid={!!errors.email} aria-describedby={errors.email ? "nd-email-error" : undefined} />
              {errors.email && (
                <span id="nd-email-error" className="text-xs font-normal text-destructive">
                  {errors.email}
                </span>
              )}
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)} />
              <span>
                Email a temporary password now
                <span className="block text-xs text-muted-foreground">Off: prepare its developments first, then use “Send access” on its Account tab.</span>
              </span>
            </label>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="new-developer" disabled={busy}>
              {busy ? "Creating…" : "Create and continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
