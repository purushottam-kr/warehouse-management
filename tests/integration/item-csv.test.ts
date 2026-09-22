import dotenv from "dotenv";
import { Pool } from "pg";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
} from "vitest";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const BASE_URL =
  process.env.TEST_BASE_URL ?? "http://localhost:3000";

const RUN_ID = Math.random()
  .toString(16)
  .slice(2, 10)
  .toUpperCase();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let sessionCookie = "";

const authedFetch = async (
  path: string,
  init: RequestInit = {},
): Promise<Response> => {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      Cookie: sessionCookie,
    },
  });
};

const login = async (): Promise<void> => {
  const email = `csv-${RUN_ID.toLowerCase()}@test.local`;

  await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "password123",
      name: "CSV Integration Tests",
    }),
  });

  const loginResponse = await fetch(
    `${BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "password123",
      }),
    },
  );

  if (loginResponse.status !== 200) {
    throw new Error(
      `Test login failed: ${loginResponse.status}`,
    );
  }

  const cookies = loginResponse.headers.getSetCookie();
  const session = cookies.find((cookie) =>
    cookie.startsWith("warehouse_session="),
  );

  if (!session) {
    throw new Error("No session cookie received");
  }

  sessionCookie = session.split(";")[0] as string;
};

const createItem = async (
  body: Record<string, unknown>,
): Promise<{ status: number; sku: string }> => {
  const response = await authedFetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const parsed = (await response.json()) as {
    data?: { sku?: string };
  };

  return {
    status: response.status,
    sku: parsed.data?.sku ?? "",
  };
};

const exportItems = async (
  query = "",
): Promise<Response> => {
  return authedFetch(`/api/items/export${query}`, {
    cache: "no-store",
  });
};

const importCsv = async (
  filename: string,
  content: string,
  mimeType = "text/csv",
): Promise<{ status: number; body: unknown }> => {
  const formData = new FormData();

  formData.append(
    "file",
    new File([content], filename, {
      type: mimeType,
    }),
  );

  const response = await authedFetch("/api/items/import", {
    method: "POST",
    body: formData,
  });

  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
};

type ImportErrorBody = {
  error: {
    code?: string;
    message?: string;
    details?: {
      created?: number;
      rejected?: number;
      errors?: Array<{
        row: number;
        sku?: string;
        messages: string[];
      }>;
    };
  };
};

type ImportSuccessBody = {
  data: {
    created: number;
    rejected: number;
    errors: unknown[];
  };
};

const sku = (key: string): string =>
  `CSV-${RUN_ID}-${key}`;

describe("V2-5 item CSV import/export (integration)", () => {
  beforeAll(async () => {
    await login();
  });

  afterAll(async () => {
    await pool.query(
      "DELETE FROM allocations WHERE item_id IN (SELECT id FROM items WHERE sku LIKE $1)",
      [`CSV-${RUN_ID}-%`],
    );

    await pool.query(
      "DELETE FROM inventory_movements WHERE item_id IN (SELECT id FROM items WHERE sku LIKE $1)",
      [`CSV-${RUN_ID}-%`],
    );

    await pool.query(
      "DELETE FROM items WHERE sku LIKE $1 OR sku LIKE $2",
      [`CSV-${RUN_ID}-%`, `=CSV-${RUN_ID}-%`],
    );

    await pool.end();
  });

  test("exports matching items as a UTF-8 CSV attachment", async () => {
    const created = await createItem({
      sku: sku("EXPORT-1"),
      name: "Export Widget",
      unit: "pcs",
    });

    expect(created.status).toBe(201);

    const response = await exportItems(
      `?search=${RUN_ID}&page=1&pageSize=25`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(
      "text/csv",
    );
    expect(
      response.headers.get("Content-Disposition"),
    ).toContain("attachment");

    const buffer = Buffer.from(
      await response.arrayBuffer(),
    );

    /* Raw UTF-8 BOM bytes: TextDecoder would strip these. */
    expect([buffer[0], buffer[1], buffer[2]]).toEqual([
      0xef, 0xbb, 0xbf,
    ]);

    const text = buffer.toString("utf-8");

    expect(text.startsWith("\uFEFF")).toBe(true);

    const [header, ...rows] = text
      .replace(/^\uFEFF/, "")
      .trim()
      .split("\r\n");

    expect(header).toBe(
      "sku,name,description,unit,requiredStorageType",
    );
    expect(
      rows.some((row) =>
        row.includes(sku("EXPORT-1")),
      ),
    ).toBe(true);
  });

  test("export honours the search filter", async () => {
    const response = await exportItems(
      `?search=${encodeURIComponent(sku("EXPORT-1"))}`,
    );

    expect(response.status).toBe(200);

    const text = await response.text();
    const rows = text
      .replace(/^\uFEFF/, "")
      .trim()
      .split("\r\n");

    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain(sku("EXPORT-1"));
  });

  test("export neutralises spreadsheet formulas", async () => {
    const created = await createItem({
      sku: `=CSV-${RUN_ID}-EVIL`,
      name: "@malicious",
      unit: "pcs",
    });

    expect(created.status).toBe(201);

    const response = await exportItems(
      `?search=${encodeURIComponent(`=CSV-${RUN_ID}-EVIL`)}`,
    );

    expect(response.status).toBe(200);

    const text = await response.text();

    expect(text).toContain("'=CSV-");
    expect(text).toContain("'@malicious");
  });

  test("export rejects invalid filters", async () => {
    const response = await exportItems(
      "?warehouseId=not-a-uuid",
    );

    expect(response.status).toBe(400);
  });

  test("imports a valid file transactionally", async () => {
    const { status, body } = await importCsv(
      "items.csv",
      [
        "sku,name,description,unit,requiredStorageType",
        `${sku("IMP-1")},Widget One,First widget,pcs,COLD`,
        `${sku("IMP-2")},"Widget, Two","Has ""quotes""",box,`,
      ].join("\n"),
    );

    expect(status).toBe(201);

    const success = body as ImportSuccessBody;

    expect(success.data.created).toBe(2);
    expect(success.data.rejected).toBe(0);
    expect(success.data.errors).toEqual([]);

    const exported = await exportItems(
      `?search=${encodeURIComponent(sku("IMP-1"))}`,
    );
    const text = await exported.text();

    expect(text).toContain(sku("IMP-1"));
  });

  test("a single invalid row rejects the whole file", async () => {
    const { status, body } = await importCsv(
      "items.csv",
      [
        "sku,name,description,unit,requiredStorageType",
        `${sku("ATOMIC-OK")},Fine Widget,,pcs,`,
        ",Missing SKU,,pcs,",
      ].join("\n"),
    );

    expect(status).toBe(400);

    const failure = body as ImportErrorBody;

    expect(failure.error.code).toBe(
      "CSV_VALIDATION_ERROR",
    );
    expect(failure.error.details?.created).toBe(0);
    expect(failure.error.details?.rejected).toBe(1);
    expect(
      failure.error.details?.errors?.[0]?.row,
    ).toBe(3);

    /* All-or-nothing: the valid row must not exist. */
    const exported = await exportItems(
      `?search=${encodeURIComponent(sku("ATOMIC-OK"))}`,
    );
    const text = await exported.text();

    expect(text).not.toContain(sku("ATOMIC-OK"));
  });

  test("rejects duplicates within the file", async () => {
    const { status, body } = await importCsv(
      "items.csv",
      [
        "sku,name,unit",
        `${sku("DUP")},First,pcs`,
        `${sku("DUP")},Second,pcs`,
      ].join("\n"),
    );

    expect(status).toBe(400);

    const failure = body as ImportErrorBody;

    expect(
      failure.error.details?.errors?.[0]?.messages.join(
        " ",
      ),
    ).toContain("Duplicate SKU");
  });

  test("rejects SKUs that already exist", async () => {
    const { status, body } = await importCsv(
      "items.csv",
      [
        "sku,name,unit",
        `${sku("EXPORT-1")},Clash,pcs`,
        `${sku("FRESH")},Fresh,pcs`,
      ].join("\n"),
    );

    expect(status).toBe(400);

    const failure = body as ImportErrorBody;

    expect(
      failure.error.details?.errors?.[0]?.messages.join(
        " ",
      ),
    ).toContain("already exists");

    const exported = await exportItems(
      `?search=${encodeURIComponent(sku("FRESH"))}`,
    );
    const text = await exported.text();

    expect(text).not.toContain(sku("FRESH"));
  });

  test("rejects files with missing required columns", async () => {
    const { status, body } = await importCsv(
      "items.csv",
      ["name,unit", "No Sku,pcs"].join("\n"),
    );

    expect(status).toBe(400);
    expect(
      (body as ImportErrorBody).error.message,
    ).toContain("Missing required CSV columns");
  });

  test("rejects non-CSV extensions and empty files", async () => {
    const wrongExtension = await importCsv(
      "items.txt",
      "sku,name,unit\nABC,Widget,pcs\n",
    );

    expect(wrongExtension.status).toBe(400);

    const empty = await importCsv("items.csv", "");

    expect(empty.status).toBe(400);
  });

  test("rejects files over the row limit", async () => {
    const header = "sku,name,unit";
    const rows = Array.from(
      { length: 1001 },
      (_, index) => `${sku(`LIMIT-${index}`)},Bulk,pcs`,
    );

    const { status, body } = await importCsv(
      "items.csv",
      [header, ...rows].join("\n"),
    );

    expect(status).toBe(400);
    expect(
      (body as ImportErrorBody).error.message,
    ).toContain("Maximum allowed is 1000");
  });

  test("requires authentication", async () => {
    const formData = new FormData();

    formData.append(
      "file",
      new File(["sku,name,unit"], "items.csv", {
        type: "text/csv",
      }),
    );

    const response = await fetch(
      `${BASE_URL}/api/items/import`,
      {
        method: "POST",
        body: formData,
      },
    );

    expect(response.status).toBe(401);

    const exportResponse = await fetch(
      `${BASE_URL}/api/items/export`,
    );

    expect(exportResponse.status).toBe(401);
  });
});
