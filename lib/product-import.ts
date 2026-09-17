import { z } from "zod";
import Papa from "papaparse";
import ExcelJS from "exceljs";

/**
 * Bulk product import (Phase 1.2). One row = one Product, joined to its
 * Medicine (matched by genericName+form+strength, created if new) and
 * Manufacturer (matched by name, created if new).
 *
 * Barcodes are optional at import time — a row with a barcode that matches
 * an existing Product updates it; a row without one (or with a barcode that
 * doesn't match anything) always creates a new Product, since there's no
 * other reliable match key.
 */

function emptyToUndefined(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

function parseBoolLike(value: unknown): unknown {
  const v = emptyToUndefined(value);
  if (v === undefined || typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return v; // let zod reject it with a clear message
}

function parseNumberLike(value: unknown): unknown {
  const v = emptyToUndefined(value);
  if (v === undefined || typeof v === "number") return v;
  const n = Number(String(v).trim().replace(/,/g, ""));
  return Number.isNaN(n) ? v : n;
}

export const ProductImportRowSchema = z.object({
  genericName: z.preprocess(emptyToUndefined, z.string().min(1, "genericName is required")),
  form: z.preprocess(emptyToUndefined, z.string().min(1, "form is required")),
  brandName: z.preprocess(emptyToUndefined, z.string().min(1, "brandName is required")),
  strength: z.preprocess(emptyToUndefined, z.string().optional()),
  category: z.preprocess(emptyToUndefined, z.string().optional()), // clinical category, e.g. "Antimicrobial" — cross-referenced against MedicineCategory
  requiresPrescription: z.preprocess(parseBoolLike, z.boolean().optional().default(false)),
  manufacturer: z.preprocess(emptyToUndefined, z.string().optional()),
  packSize: z.preprocess(emptyToUndefined, z.string().optional()),
  barcode: z.preprocess(emptyToUndefined, z.string().optional()),
  defaultMrp: z.preprocess(parseNumberLike, z.number().positive().optional()),
  sellsByUnit: z.preprocess(parseBoolLike, z.boolean().optional().default(false)),
  unitLabel: z.preprocess(emptyToUndefined, z.string().optional()),
  unitPrice: z.preprocess(parseNumberLike, z.number().positive().optional()),
  unitsPerPack: z.preprocess(parseNumberLike, z.number().int().positive().optional()),
  packLabel: z.preprocess(emptyToUndefined, z.string().optional()),
  packPrice: z.preprocess(parseNumberLike, z.number().positive().optional()),
  vatRate: z.preprocess(parseNumberLike, z.number().min(0).max(100).optional()),
  // Uniform % discount off whichever of defaultMrp/packPrice/unitPrice is
  // relevant to the sale — see Product.discountPercent's schema comment.
  discountPercent: z.preprocess(parseNumberLike, z.number().min(0).max(100).optional()),
  // Storefront display category, e.g. "Baby Care" — distinct from `category`
  // above. Matched/created by name against the Category model.
  displayCategory: z.preprocess(emptyToUndefined, z.string().optional()),
  // Pharmacist-authored content sections — shown as their own accordion
  // section on the product page. Never auto-generated.
  indications: z.preprocess(emptyToUndefined, z.string().optional()),
  dosageAdministration: z.preprocess(emptyToUndefined, z.string().optional()),
  sideEffects: z.preprocess(emptyToUndefined, z.string().optional()),
  precautionsWarnings: z.preprocess(emptyToUndefined, z.string().optional()),
  // Direct image URL (e.g. a Dropbox share link) — fetched and re-uploaded
  // to R2 server-side at commit time. Multiple images: separate with `|`.
  imageUrl: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type ProductImportRow = z.infer<typeof ProductImportRowSchema>;

export interface ParsedImportRow {
  rowNumber: number; // 1-indexed, matching the spreadsheet row (header = row 1)
  raw: Record<string, unknown>;
  data: ProductImportRow | null;
  errors: string[];
}

export const IMPORT_TEMPLATE_COLUMNS = [
  "genericName",
  "form",
  "brandName",
  "strength",
  "category",
  "requiresPrescription",
  "manufacturer",
  "packSize",
  "barcode",
  "defaultMrp",
  "sellsByUnit",
  "unitLabel",
  "unitPrice",
  "unitsPerPack",
  "packLabel",
  "packPrice",
  "vatRate",
  "discountPercent",
  "displayCategory",
  "indications",
  "dosageAdministration",
  "sideEffects",
  "precautionsWarnings",
  "imageUrl",
] as const;

async function rawRowsFromCsv(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return result.data;
}

async function rawRowsFromExcel(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, unknown> = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const value = cell.value;
      if (value !== null && value !== undefined && value !== "") hasValue = true;
      record[header] = typeof value === "object" && value && "text" in value ? (value as { text: string }).text : value;
    });
    if (hasValue) rows.push(record);
  });
  return rows;
}

export async function parseWorkbookBuffer(buffer: Buffer, filename: string): Promise<Record<string, unknown>[]> {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  return isCsv ? rawRowsFromCsv(buffer) : rawRowsFromExcel(buffer);
}

export function validateImportRows(rawRows: Record<string, unknown>[]): ParsedImportRow[] {
  return rawRows.map((raw, index) => {
    const result = ProductImportRowSchema.safeParse(raw);
    return {
      rowNumber: index + 2, // +1 for 0-index, +1 for the header row
      raw,
      data: result.success ? result.data : null,
      errors: result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  });
}
