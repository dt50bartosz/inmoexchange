"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import { ArrowLeft, CheckCircle2, Download, FileUp, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PanelCard from "@/components/panel/PanelCard";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { LEAD_CSV_COLUMNS, LEAD_IMPORT_MAX_ROWS, leadCsvRowSchema, type LeadCsvColumn } from "@/lib/schemas/developer-leads";
import { importDeveloperLeadsAction, type ImportReport } from "@/app/[locale]/admin/promotoras-llamadas/server/actions";
import AdminPage from "../ui/AdminPage";
import { LEAD_STATUS_LABELS } from "./lead-ui";

type PreviewRow = {
  /** Line in the file (the header is line 1). */
  row: number;
  cells: Record<LeadCsvColumn, string>;
  errors: string[];
};

const MESSAGES: Record<string, string> = {
  required: "is required",
  phone: "is not a valid phone number",
  email: "is not a valid email",
  url: "is not a valid web address",
  pickOne: "must be one of: " + Object.keys(LEAD_STATUS_LABELS).join(", "),
  tooLong: "is too long",
};

/** "phones.1.number" → "Phone number 2"; "company" → "company". */
const fieldName = (path: string) => {
  const m = /^phones\.(\d+)\.number$/.exec(path);
  return m ? `Phone number ${Number(m[1]) + 1}` : path;
};

/** Header cell → template column, ignoring case, spaces, dashes and underscores ("Contact person" → contactPerson). */
const COLUMN_BY_KEY = new Map(LEAD_CSV_COLUMNS.map((c) => [c.toLowerCase(), c]));
// The invisible BOM that Excel puts before the first header is ignored too
const toColumn = (h: string) => COLUMN_BY_KEY.get(h.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_-]+/g, "")) ?? null;

/** The template: the header row plus nothing else (no example people in it). */
function downloadTemplate() {
  const blob = new Blob([`${LEAD_CSV_COLUMNS.join(",")}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "developer-calls-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * CSV import: the file is read in the browser (comma or semicolon), every row is checked with the same rules as the
 * server (leadCsvRowSchema), and only valid rows are sent. The server checks again and skips duplicates.
 */
export default function LeadImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState("");
  const [parsed, setParsed] = useState<{ rows: { row: number; cells: Record<LeadCsvColumn, string> }[]; unknown: string[]; missing: LeadCsvColumn[] } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, startTransition] = useTransition();

  const read = (file: File) => {
    setReport(null);
    setFileName(file.name);
    setSource((s) => s || `CSV import: ${file.name}`);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transform: (v) => (typeof v === "string" ? v : ""),
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        const map = headers.map((h) => [h, toColumn(h)] as const);
        const unknown = map.filter(([, c]) => !c).map(([h]) => h);
        const known = new Set(map.map(([, c]) => c).filter(Boolean));
        const missing = (["company"] as LeadCsvColumn[]).filter((c) => !known.has(c));
        const rows = res.data.map((r, i) => {
          const cells = Object.fromEntries(LEAD_CSV_COLUMNS.map((c) => [c, ""])) as Record<LeadCsvColumn, string>;
          for (const [h, c] of map) if (c) cells[c] = (r[h] ?? "").trim();
          return { row: i + 2, cells };
        });
        setParsed({ rows, unknown, missing });
      },
      error: () => toast.error("Couldn't read this file. Save it as CSV (comma or semicolon separated) and try again."),
    });
  };

  // Rows without a source get the one typed above (GDPR: where every contact came from)
  const preview: PreviewRow[] = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map(({ row, cells }) => {
      const withSource = { ...cells, source: cells.source || source.trim() };
      const r = leadCsvRowSchema.safeParse(withSource);
      const errors = r.success ? [] : r.error.issues.map((iss) => `${fieldName(iss.path.join("."))} ${MESSAGES[String(iss.message)] ?? "is not valid"}`);
      return { row, cells: withSource, errors };
    });
  }, [parsed, source]);

  const valid = preview.filter((r) => r.errors.length === 0);
  const tooMany = valid.length > LEAD_IMPORT_MAX_ROWS;

  const runImport = () =>
    startTransition(async () => {
      const res = await importDeveloperLeadsAction({ rows: valid.map(({ row, cells }) => ({ row, cells })) }).catch(() => null);
      if (!res?.ok) {
        toast.error("The import failed. Nothing was added. Try again.");
        return;
      }
      setReport(res.data);
      toast.success(`${res.data.imported} developer${res.data.imported === 1 ? "" : "s"} imported.`);
    });

  return (
    <AdminPage
      title="Import developers from CSV"
      description="Upload a CSV file, check the preview, then import. Rows that match a developer already in the list (same phone number or company name), or an earlier row of the file, are skipped."
      back={
        <Link href={ADMIN_ROUTES.developerLeads} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Developer calls
        </Link>
      }
      actions={
        <Button type="button" variant="outline" onClick={downloadTemplate}>
          <Download aria-hidden className="size-4" />
          Download template
        </Button>
      }
    >
      <PanelCard className="mb-6 grid gap-4 p-5">
        <p className="text-sm text-muted-foreground">
          Columns (first row): <span className="font-mono text-xs text-foreground">{LEAD_CSV_COLUMNS.join(", ")}</span>. Only <strong>company</strong> and{" "}
          <strong>source</strong> are required; phone numbers are imported exactly as written; an empty status means “New”.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-sm font-medium">CSV file</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) read(f);
              }}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              <FileUp aria-hidden className="size-4" />
              {fileName ? "Choose another file" : "Choose CSV file"}
            </Button>
            {fileName && <p className="mt-1.5 truncate text-sm text-muted-foreground">{fileName}</p>}
          </div>
          <div>
            <label htmlFor="lead-import-source" className="mb-1.5 block text-sm font-medium">
              Source for rows without one <span className="text-destructive">*</span>
            </label>
            <Input id="lead-import-source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Where these contacts came from" maxLength={120} />
            <p className="mt-1 text-xs text-muted-foreground">Saved on every row whose source column is empty (GDPR: where each contact came from).</p>
          </div>
        </div>
      </PanelCard>

      {parsed && (parsed.missing.length > 0 || parsed.unknown.length > 0) && (
        <div role="alert" className="mb-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          {parsed.missing.length > 0 && (
            <p className="flex items-center gap-2 font-medium">
              <TriangleAlert aria-hidden className="size-4 text-warning" />
              Missing column: {parsed.missing.join(", ")}. Check the first row of the file (download the template to compare).
            </p>
          )}
          {parsed.unknown.length > 0 && <p className="mt-1">Ignored columns (not in the template): {parsed.unknown.join(", ")}</p>}
        </div>
      )}

      {report && (
        <section className="mb-6 rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <CheckCircle2 aria-hidden className="size-5 text-success" />
            Import finished
          </h2>
          <p className="mt-2 text-sm">
            <strong>{report.imported}</strong> imported · <strong>{report.skipped.length}</strong> skipped as duplicates
            {report.invalid.length > 0 && (
              <>
                {" "}
                · <strong>{report.invalid.length}</strong> refused
              </>
            )}
          </p>
          {report.skipped.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-6 text-sm">
              {report.skipped.map((s) => (
                <li key={s.row}>
                  Row {s.row}, {s.company}: same {s.duplicateOf.reason === "phone" ? `phone (${s.duplicateOf.match})` : "company name"} as{" "}
                  {/* An existing developer, or the one just imported from an earlier row of this file */}
                  <Link href={ADMIN_ROUTES.developerLead(s.duplicateOf.id)} className="font-medium underline underline-offset-2">
                    {s.duplicateOf.company}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {report.invalid.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-destructive">
              {report.invalid.map((r) => (
                <li key={r.row}>
                  Row {r.row}: {Object.entries(r.errors).map(([f, m]) => `${fieldName(f)} ${MESSAGES[m] ?? "is not valid"}`).join("; ")}
                </li>
              ))}
            </ul>
          )}
          <Link href={ADMIN_ROUTES.developerLeads} className="mt-4 inline-block text-sm font-medium underline underline-offset-2">
            Back to the list
          </Link>
        </section>
      )}

      {parsed && !report && (
        <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm" aria-live="polite">
              {preview.length} rows · <span className="text-success">{valid.length} ready</span>
              {preview.length - valid.length > 0 && <span className="text-destructive"> · {preview.length - valid.length} with errors (not imported)</span>}
            </p>
            <Button type="button" onClick={runImport} disabled={busy || valid.length === 0 || tooMany || parsed.missing.length > 0}>
              {busy ? "Importing…" : `Import ${valid.length} row${valid.length === 1 ? "" : "s"}`}
            </Button>
          </div>
          {tooMany && <p className="mb-2 text-sm text-destructive">At most {LEAD_IMPORT_MAX_ROWS} rows per import: split the file.</p>}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Row</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phones</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      The file has no rows under the header.
                    </TableCell>
                  </TableRow>
                ) : (
                  preview.map((r) => (
                    <TableRow key={r.row} className={r.errors.length ? "bg-destructive/5" : undefined}>
                      <TableCell className="tabular-nums text-muted-foreground">{r.row}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">{r.cells.company || "—"}</TableCell>
                      <TableCell className="max-w-[180px]">
                        <p className="truncate">{r.cells.contactPerson || "—"}</p>
                        {r.cells.role && <p className="truncate text-xs text-muted-foreground">{r.cells.role}</p>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(
                          [
                            ["Mobile", r.cells.mobile],
                            ["Office", r.cells.office],
                            ["WhatsApp", r.cells.whatsapp],
                            ["Other", r.cells.otherPhone],
                          ] as const
                        )
                          .filter(([, n]) => n)
                          .map(([t, n]) => (
                            <span key={t} className="block whitespace-nowrap">
                              {n} <span className="text-xs text-muted-foreground">{t}</span>
                            </span>
                          ))}
                        {!r.cells.mobile && !r.cells.office && !r.cells.whatsapp && !r.cells.otherPhone && <span className="text-muted-foreground">No number</span>}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-muted-foreground">{r.cells.area || "—"}</TableCell>
                      <TableCell className="text-sm">{r.cells.status || "new"}</TableCell>
                      <TableCell className="text-sm">
                        {r.errors.length === 0 ? (
                          <Badge variant="secondary" className="bg-success-soft text-success">
                            OK
                          </Badge>
                        ) : (
                          <ul className="text-destructive">
                            {r.errors.map((err) => (
                              <li key={err}>{err}</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </AdminPage>
  );
}
