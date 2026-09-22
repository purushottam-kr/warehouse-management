import { describe, expect, test } from "vitest";

import {
  escapeCsvField,
  mapItemCsvHeader,
  parseCsvText,
  sanitizeCsvFormulaValue,
  serializeItemsToCsv,
} from "@/lib/csv/item-csv";
import type { Item } from "@/types/item";

const item = (overrides: Partial<Item> = {}): Item => ({
  id: "00000000-0000-0000-0000-000000000000",
  sku: "SKU-1",
  name: "Widget",
  description: null,
  unit: "pcs",
  requiredStorageType: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("escapeCsvField", () => {
  test("leaves plain values untouched", () => {
    expect(escapeCsvField("SKU-1")).toBe("SKU-1");
  });

  test("quotes values with commas, quotes, or newlines", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe(
      '"say ""hi"""',
    );
    expect(escapeCsvField("line1\nline2")).toBe(
      '"line1\nline2"',
    );
    expect(escapeCsvField("line1\r\nline2")).toBe(
      '"line1\r\nline2"',
    );
  });
});

describe("sanitizeCsvFormulaValue", () => {
  test("prefixes spreadsheet formula triggers", () => {
    expect(sanitizeCsvFormulaValue("=1+1")).toBe(
      "'=1+1",
    );
    expect(sanitizeCsvFormulaValue("+1+1")).toBe(
      "'+1+1",
    );
    expect(sanitizeCsvFormulaValue("-1+1")).toBe(
      "'-1+1",
    );
    expect(sanitizeCsvFormulaValue("@SUM(A1:A2)")).toBe(
      "'@SUM(A1:A2)",
    );
    expect(sanitizeCsvFormulaValue("\t=cmd")).toBe(
      "'\t=cmd",
    );
  });

  test("catches triggers hidden behind leading spaces", () => {
    expect(sanitizeCsvFormulaValue("  =1+1")).toBe(
      "'  =1+1",
    );
  });

  test("leaves ordinary values alone", () => {
    expect(sanitizeCsvFormulaValue("")).toBe("");
    expect(sanitizeCsvFormulaValue("SKU-1")).toBe(
      "SKU-1",
    );
    expect(sanitizeCsvFormulaValue("Cold Storage")).toBe(
      "Cold Storage",
    );
  });
});

describe("serializeItemsToCsv", () => {
  test("emits BOM, header, and CRLF rows as UTF-8", () => {
    const csv = serializeItemsToCsv([
      item({
        sku: "SKU-1",
        name: "Widget, large",
        description: 'He said "hi"',
        unit: "pcs",
        requiredStorageType: "COLD",
      }),
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toBe(
      "\uFEFFsku,name,description,unit,requiredStorageType\r\n" +
        'SKU-1,"Widget, large","He said ""hi""",pcs,COLD\r\n',
    );
  });

  test("neutralises formula injection in every column", () => {
    const csv = serializeItemsToCsv([
      item({
        sku: "=2+5",
        name: "@evil",
        description: "-payload",
        unit: "+pcs",
        requiredStorageType: null,
      }),
    ]);

    expect(csv).toContain("'=2+5");
    expect(csv).toContain("'@evil");
    expect(csv).toContain("'-payload");
    expect(csv).toContain("'+pcs");
  });
});

describe("parseCsvText", () => {
  test("parses quoted commas, escaped quotes, and CRLF", () => {
    const rows = parseCsvText(
      'sku,name,description,unit,requiredStorageType\r\n' +
        'SKU-1,"Widget, large","He said ""hi""",pcs,COLD\r\n' +
        "SKU-2,Plain,,box,\r\n",
    );

    expect(rows).toEqual([
      [
        "sku",
        "name",
        "description",
        "unit",
        "requiredStorageType",
      ],
      [
        "SKU-1",
        "Widget, large",
        'He said "hi"',
        "pcs",
        "COLD",
      ],
      ["SKU-2", "Plain", "", "box", ""],
    ]);
  });

  test("handles multiline quoted fields and strips BOM", () => {
    const rows = parseCsvText(
      "\uFEFFsku,name\nSKU-1,\"line1\nline2\"\n",
    );

    expect(rows).toEqual([
      ["sku", "name"],
      ["SKU-1", "line1\nline2"],
    ]);
  });

  test("throws on unbalanced quotes", () => {
    expect(() =>
      parseCsvText('sku,name\nSKU-1,"oops\n'),
    ).toThrow();
  });
});

describe("mapItemCsvHeader", () => {
  test("accepts header variants", () => {
    expect(mapItemCsvHeader("sku")).toBe("sku");
    expect(mapItemCsvHeader(" SKU ")).toBe("sku");
    expect(mapItemCsvHeader("requiredStorageType")).toBe(
      "requiredStorageType",
    );
    expect(mapItemCsvHeader("required_storage_type")).toBe(
      "requiredStorageType",
    );
    expect(mapItemCsvHeader("Required Storage Type")).toBe(
      "requiredStorageType",
    );
    expect(mapItemCsvHeader("nope")).toBeNull();
  });
});

describe("CSV round-trip", () => {
  test("ordinary values survive serialize then parse", () => {
    const original = item({
      sku: "SKU-9",
      name: "Widget, large",
      description: 'Quote " and, comma',
      unit: "pcs",
      requiredStorageType: "COLD",
    });

    const [, dataRow] = parseCsvText(
      serializeItemsToCsv([original]),
    ) as [string[], string[]];

    expect(dataRow).toEqual([
      "SKU-9",
      "Widget, large",
      'Quote " and, comma',
      "pcs",
      "COLD",
    ]);
  });
});
