import { connection } from "next/server";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminPage from "@/components/admin/ui/AdminPage";
import LocalTime from "@/components/developers/LocalTime";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { LEGAL_DOCS } from "@/lib/constants/legal-docs";
import { ensureIndexes } from "@/lib/db";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { legalOverview } from "@/lib/server/legal-docs";

/** Admin → Legal documents: every document, the version in force and any draft. */
export default async function Page() {
  await connection(); // always read fresh data, never prerender at build
  await requireAdmin();
  await ensureIndexes();
  const rows = await legalOverview();

  return (
    <AdminPage
      title="Legal documents"
      description="Versioned legal texts in Spanish, English and Polish. Publishing a version archives the previous one; old versions stay readable, because they are what people accepted. Text in {{double braces}} is shown as a placeholder for a legal professional to complete."
    >
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>In force</TableHead>
              <TableHead>Draft</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const meta = LEGAL_DOCS[r.key];
              return (
                <TableRow key={r.key}>
                  <TableCell>
                    <Link href={ADMIN_ROUTES.legalDoc(r.key)} className="font-medium hover:underline">
                      {meta.label}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{meta.path}</span>
                  </TableCell>
                  <TableCell>
                    {r.published ? (
                      <>
                        <Badge variant="secondary">v{r.published.version}</Badge>
                        <span className="ml-2 text-xs text-muted-foreground">
                          <LocalTime iso={r.published.publishedAt} mode="date" />
                        </span>
                      </>
                    ) : meta.builtIn ? (
                      <span className="text-sm text-muted-foreground">Built-in text (not managed here yet)</span>
                    ) : (
                      <Badge variant="destructive">Not published</Badge>
                    )}
                  </TableCell>
                  <TableCell>{r.draft ? <Badge variant="outline">Draft v{r.draft.version}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={ADMIN_ROUTES.legalDoc(r.key)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        {r.draft ? "Edit draft" : "Manage"}
                      </Link>
                      <a href={meta.path} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })} aria-label={`Open ${meta.label} page`} title="Open page">
                        <ExternalLink aria-hidden className="size-4" />
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AdminPage>
  );
}
