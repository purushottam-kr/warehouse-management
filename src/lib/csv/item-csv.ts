import type { Item } from "@/types/item";

/*
 * Explicit item-CSV helpers (V2-5).
 *
 * No generic CSV framework: these helpers only know the
 * item column layout so other entities can follow the same
 * explicit Route -> Zod -> Service -> Repository pattern.
 */

export const ITEM_CSV_HEADERS = [
  "sku",
  "name",
  "description",
  "unit",
  "requiredStorageType",
] as const;

export type ItemCsvHeader =
  (typeof ITEM_CSV_HEADERS)[number];

/*
 * Import guardrails. The file-size check runs on the raw
 * upload in the route; the row check runs server-side after
 * parsing so a dense file cannot bypass the limit.
 */
export const ITEM_IMPORT_MAX_BYTES = 2 * 1024 * 1024;

export const ITEM_IMPORT_MAX_ROWS = 1000;

/* Safety cap so an export cannot OOM the route. */
export const ITEM_EXPORT_MAX_ROWS = 50_000;

/*
 * Prefix values that spreadsheet apps would interpret as
 * formulas. The leading single quote is Excel's text marker
 * (hidden in Excel) and neutralises =, +, -, @ payloads.
 */
export const sanitizeCsvFormulaValue = (
  value: string,
): string => {
  if (value.length === 0) {
    return value;
  }

  const stripped = value.replace(
    /^[\s\uFEFF]+/,
    "",
  );

  if (stripped.length === 0) {
    return value;
  }

  const first = stripped[0] as string;

  if (
    first === "=" ||
    first === "+" ||
    first === "-" ||
    first === "@" ||
    first === "\t" ||
    first === "\r"
  ) {
    return `'${value}`;
  }

  return value;
};

/* RFC 4180 field escaping. */
export const escapeCsvField = (
  value: string,
): string => {
  if (
    value.includes('"') ||
    value.includes(",") ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

export const serializeItemsToCsv = (
  items: Item[],
): string => {
  const lines = [ITEM_CSV_HEADERS.join(",")];

  for (const item of items) {
    const values = [
      item.sku,
      item.name,
      item.description ?? "",
      item.unit,
      item.requiredStorageType ?? "",
    ].map((value) =>
      escapeCsvField(sanitizeCsvFormulaValue(value)),
    );

    lines.push(values.join(","));
  }

  /* BOM + CRLF: Excel opens the file as UTF-8 out of the box. */
  return `\uFEFF${lines.join("\r\n")}\r\n`;
};

export const buildItemsExportFilename = (
  now: Date = new Date(),
): string => {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .replace("T", "-");

  return `items-export-${stamp}.csv`;
};

/*
 * Minimal RFC 4180 parser: commas, CRLF/LF/CR newlines,
 * quoted fields, and "" escapes. Throws on unbalanced quotes.
 */
export const parseCsvText = (
  text: string,
): string[][] => {
  const normalized = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];

  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < normalized.length) {
    const char = normalized[i] as string;

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        currentField += char;
        i += 1;
      }

      continue;
    }

    if (char === '"' && currentField === "") {
      inQuotes = true;
      i += 1;
    } else if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
      i += 1;
    } else if (char === "\r" || char === "\n") {
      if (
        char === "\r" &&
        normalized[i + 1] === "\n"
      ) {
        i += 2;
      } else {
        i += 1;
      }

      currentRow.push(currentField);
      currentField = "";
      rows.push(currentRow);
      currentRow = [];
    } else {
      currentField += char;
      i += 1;
    }
  }

  if (inQuotes) {
    throw new Error("Unbalanced quotes in CSV.");
  }

  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
};

/*
 * Accepts sku/name/unit header variants such as
 * required_storage_type or "required storage type".
 */
export const normalizeItemCsvHeader = (
  header: string,
): string => {
  return header
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "");
};

const HEADER_ALIASES: Record<string, ItemCsvHeader> = {
  sku: "sku",
  name: "name",
  description: "description",
  unit: "unit",
  requiredstoragetype: "requiredStorageType",
};

export const mapItemCsvHeader = (
  header: string,
): ItemCsvHeader | null => {
  return (
    HEADER_ALIASES[normalizeItemCsvHeader(header)] ??
    null
  );
};
