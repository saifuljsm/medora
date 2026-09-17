"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseProductImportFile, commitProductImport, type CommitImportResult } from "@/app/(admin)/products/import/actions";
import { IMPORT_TEMPLATE_COLUMNS, type ParsedImportRow } from "@/lib/product-import";

type Step = "upload" | "preview" | "done";

function downloadTemplate() {
  const csv = IMPORT_TEMPLATE_COLUMNS.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "medora-product-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ProductImportClient() {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [result, setResult] = useState<CommitImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter((r) => r.data !== null);
  const invalidRows = rows.filter((r) => r.data === null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const { rows } = await parseProductImportFile(formData);
        setRows(rows);
        setStep("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse file");
      }
    });
  }

  function handleCommit() {
    setError(null);
    startTransition(async () => {
      try {
        const payload = validRows.map((r) => ({ rowNumber: r.rowNumber, data: r.data! }));
        const result = await commitProductImport(payload);
        setResult(result);
        setStep("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  function reset() {
    setStep("upload");
    setRows([]);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive-tint px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {step === "upload" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border-strong border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Upload a .csv or .xlsx file. Expected columns:
          </p>
          <p className="text-xs text-muted-text">{IMPORT_TEMPLATE_COLUMNS.join(", ")}</p>
          <p className="text-xs text-muted-text">
            <code>category</code> is the clinical category (Antimicrobial, Hormone…); <code>displayCategory</code> is the storefront
            section (Baby Care, OTC Medicine…). <code>imageUrl</code> accepts a direct image link (e.g. a Dropbox share URL) — separate
            multiple images with <code>|</code>.
          </p>
          <Button type="button" variant="link" size="sm" className="mx-auto" onClick={downloadTemplate}>
            Download empty template (.csv)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            disabled={isPending}
            className="mx-auto mt-2"
          />
          {isPending && <p className="text-sm text-muted-foreground">Parsing…</p>}
        </div>
      )}

      {step === "preview" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="secondary">{validRows.length} valid</Badge>
              {invalidRows.length > 0 && <Badge variant="destructive">{invalidRows.length} with errors</Badge>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleCommit} disabled={isPending || validRows.length === 0}>
                {isPending ? "Importing…" : `Commit ${validRows.length} row(s)`}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Generic</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>
                      {row.data ? (
                        <Badge variant="secondary">OK</Badge>
                      ) : (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </TableCell>
                    <TableCell>{String(row.raw.brandName ?? "")}</TableCell>
                    <TableCell>{String(row.raw.genericName ?? "")}</TableCell>
                    <TableCell>{String(row.raw.barcode ?? "—")}</TableCell>
                    <TableCell className="text-xs text-destructive">{row.errors.join("; ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-sm">
              Created <b>{result.created}</b>, updated <b>{result.updated}</b>
              {result.failed.length > 0 && (
                <>
                  , failed <b>{result.failed.length}</b>
                </>
              )}
              .
            </p>
          </div>
          {result.failed.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.failed.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell>{f.rowNumber ?? "—"}</TableCell>
                      <TableCell>{f.brandName ?? "—"}</TableCell>
                      <TableCell className="text-xs text-destructive">{f.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Button onClick={reset}>Import another file</Button>
        </div>
      )}
    </div>
  );
}
