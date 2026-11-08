"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PanelSection from "@/components/panel/PanelSection";
import { useBillingFormat } from "../useBillingFormat";
import type { Invoice, InvoiceStatus } from "../types";

const STATUS_CLASS: Record<InvoiceStatus, string> = {
  paid: "bg-success-soft text-success",
  open: "bg-warning-soft text-warning",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

type Props = { invoices: Invoice[]; currency: string };

export default function InvoicesSection({ invoices, currency }: Props) {
  const t = useTranslations("panel.billing.invoices");
  const f = useBillingFormat();

  const download = (inv: Invoice) => {
    // TODO backend: window.open(`/api/billing/invoices/${inv.id}/pdf`)
    toast.message(t("mockDownload", { number: inv.number }));
  };

  return (
    <PanelSection title={t("title")} description={t("description")}>
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("number")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("download")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="whitespace-nowrap">{f.date(inv.date)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{inv.number}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.money(inv.amountCents, currency)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_CLASS[inv.status]}>
                      {t(`statuses.${inv.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {inv.status !== "failed" && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => download(inv)} aria-label={t("downloadLabel", { number: inv.number })}>
                        <Download aria-hidden className="size-4" />
                        PDF
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PanelSection>
  );
}
