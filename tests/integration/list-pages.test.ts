import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
} from "vitest";

import {
  allocate,
  cleanup,
  closePool,
  request,
  seedItem,
  seedStorageSpace,
  seedUser,
  seedWarehouse,
  setStorageSpaceStatus,
  setWarehouseStatus,
  trackUser,
  RUN_ID,
  type TestItem,
  type TestStorageSpace,
  type TestUser,
  type TestWarehouse,
} from "./helpers";

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  totalCapacity: string;
  allocatedQuantity: string;
};

type ItemRow = {
  id: string;
  sku: string;
};

type StorageSpaceRow = {
  id: string;
  warehouseId: string;
  code: string;
  storageType: string;
  status: string;
};

type ApiError = {
  error: {
    code?: string;
    message?: string;
  };
};

const storageTypeFor = (key: string): string => {
  return `COLD-${RUN_ID.toUpperCase()}-${key}`;
};

/*
 * All filtered assertions are scoped by RUN_ID so
 * concurrently running test files never interfere.
 */
const RUN_SEARCH = RUN_ID.toUpperCase();

describe("V2-2 list endpoints (integration)", () => {
  let user: TestUser;
  let warehouseH1: TestWarehouse;
  let warehouseH2: TestWarehouse;
  let spaceA: TestStorageSpace;
  let spaceB: TestStorageSpace;
  let itemWithStock: TestItem;

  beforeAll(async () => {
    user = await seedUser();

    trackUser(user.id);

    warehouseH1 = await seedWarehouse("H1");
    warehouseH2 = await seedWarehouse("H2");

    /*
     * A warehouse with no storage spaces (capacity
     * aggregates must degrade to zero) and one whose
     * name embeds RUN_ID so name searches stay scoped
     * to this run while other test files run
     * concurrently.
     */
    await seedWarehouse("H3");
    await seedWarehouse(`N-${RUN_ID}`);

    spaceA = await seedStorageSpace(
      warehouseH1.id,
      "A",
      "100",
      storageTypeFor("A"),
    );

    spaceB = await seedStorageSpace(
      warehouseH1.id,
      "B",
      "50",
      storageTypeFor("B"),
    );

    itemWithStock = await seedItem(
      "STOCK",
      storageTypeFor("A"),
    );

    await seedItem("EMPTY", null);

    await setWarehouseStatus(
      warehouseH2.id,
      "INACTIVE",
    );

    await setStorageSpaceStatus(spaceB.id, "INACTIVE");

    const allocation = await allocate(
      itemWithStock.id,
      "40",
    );

    if (allocation.status !== 201) {
      throw new Error("Allocation seeding failed");
    }
  });

  afterAll(async () => {
    await cleanup();

    await closePool();
  });

  describe("GET /api/warehouses", () => {
    test("returns paginated rows with capacity aggregates", async () => {
      const { status, body } = await request<{
        data: WarehouseRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/warehouses?search=${RUN_SEARCH}&pageSize=100`,
      );

      expect(status).toBe(200);

      expect(body.pagination.total).toBe(4);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.totalPages).toBe(1);

      const byCode = new Map(
        body.data.map((row) => [row.code, row]),
      );

      const h1 = byCode.get(
        `WH-${RUN_ID}-H1`,
      ) as WarehouseRow;

      expect(Number(h1.totalCapacity)).toBe(150);
      expect(Number(h1.allocatedQuantity)).toBe(40);

      const h3 = byCode.get(
        `WH-${RUN_ID}-H3`,
      ) as WarehouseRow;

      expect(Number(h3.totalCapacity)).toBe(0);
      expect(Number(h3.allocatedQuantity)).toBe(0);
    });

    test("filters by status", async () => {
      const { status, body } = await request<{
        data: WarehouseRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/warehouses?search=${RUN_SEARCH}&status=INACTIVE`,
      );

      expect(status).toBe(200);
      expect(body.pagination.total).toBe(1);
      expect(body.data[0]!.code).toBe(
        `WH-${RUN_ID}-H2`,
      );
    });

    test("searches by name", async () => {
      const { status, body } = await request<{
        data: WarehouseRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/warehouses?search=${encodeURIComponent(
          `Warehouse N-${RUN_ID}`,
        )}`,
      );

      expect(status).toBe(200);
      expect(body.pagination.total).toBe(1);
      expect(body.data[0]!.code).toBe(
        `WH-${RUN_ID}-N-${RUN_ID}`,
      );
    });

    test("paginates and clamps stale pages", async () => {
      const { status, body } = await request<{
        data: WarehouseRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/warehouses?search=${RUN_SEARCH}&page=99&pageSize=1`,
      );

      expect(status).toBe(200);

      expect(body.pagination.total).toBe(4);
      expect(body.pagination.totalPages).toBe(4);
      expect(body.pagination.page).toBe(4);
      expect(body.data).toHaveLength(1);
    });

    test("returns the full unpaged list without query params", async () => {
      const { status, body } = await request<{
        data: WarehouseRow[];
        pagination?: Pagination;
      }>("GET", "/api/warehouses");

      expect(status).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeUndefined();

      const codes = body.data.map((row) => row.code);

      expect(codes).toContain(`WH-${RUN_ID}-H1`);
    });

    test("rejects invalid filters", async () => {
      const { status, body } =
        await request<ApiError>(
          "GET",
          "/api/warehouses?page=1&pageSize=10&status=BOGUS",
        );

      expect(status).toBe(400);
      expect(body.error.code).toBe(
        "VALIDATION_ERROR",
      );
    });
  });

  describe("GET /api/items", () => {
    test("searches by SKU", async () => {
      const { status, body } = await request<{
        data: ItemRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/items?search=${RUN_SEARCH}&pageSize=100`,
      );

      expect(status).toBe(200);
      expect(body.pagination.total).toBe(2);

      const skus = body.data.map((row) => row.sku);

      expect(skus).toContain(
        `SKU-${RUN_ID}-STOCK`,
      );
      expect(skus).toContain(
        `SKU-${RUN_ID}-EMPTY`,
      );
    });

    test("filters by warehouse membership", async () => {
      const { status, body } = await request<{
        data: ItemRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/items?warehouseId=${warehouseH1.id}`,
      );

      expect(status).toBe(200);
      expect(body.pagination.total).toBe(1);
      expect(body.data[0]!.sku).toBe(
        `SKU-${RUN_ID}-STOCK`,
      );
    });

    test("filters by storage-space membership", async () => {
      const { status, body } = await request<{
        data: ItemRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/items?storageSpaceId=${spaceA.id}`,
      );

      expect(status).toBe(200);
      expect(body.pagination.total).toBe(1);
      expect(body.data[0]!.sku).toBe(
        `SKU-${RUN_ID}-STOCK`,
      );
    });

    test("returns no items for a warehouse without stock", async () => {
      const { status, body } = await request<{
        data: ItemRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/items?warehouseId=${warehouseH2.id}`,
      );

      expect(status).toBe(200);
      expect(body.pagination.total).toBe(0);
      expect(body.data).toHaveLength(0);
    });

    test("rejects invalid filters", async () => {
      const { status, body } =
        await request<ApiError>(
          "GET",
          "/api/items?page=1&warehouseId=not-a-uuid",
        );

      expect(status).toBe(400);
      expect(body.error.code).toBe(
        "VALIDATION_ERROR",
      );
    });
  });

  describe("GET /api/storage-spaces", () => {
    test("returns paginated rows joined with warehouse names", async () => {
      const { status, body } = await request<{
        data: StorageSpaceRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/storage-spaces?search=${RUN_SEARCH}&pageSize=100`,
      );

      expect(status).toBe(200);
      expect(body.pagination.total).toBe(2);

      const codes = body.data.map(
        (row) => row.code,
      );

      expect(codes).toContain(`SP-${RUN_ID}-A`);
      expect(codes).toContain(`SP-${RUN_ID}-B`);
    });

    test("filters by status", async () => {
      const { status, body } = await request<{
        data: StorageSpaceRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/storage-spaces?search=${RUN_SEARCH}&status=INACTIVE`,
      );

      expect(status).toBe(200);
      expect(body.pagination.total).toBe(1);
      expect(body.data[0]!.code).toBe(
        `SP-${RUN_ID}-B`,
      );
    });

    test("filters by storage type case-insensitively", async () => {
      const { status, body } = await request<{
        data: StorageSpaceRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/storage-spaces?search=${RUN_SEARCH}&storageType=${storageTypeFor(
          "B",
        ).toLowerCase()}`,
      );

      expect(status).toBe(200);
      expect(body.pagination.total).toBe(1);
      expect(body.data[0]!.code).toBe(
        `SP-${RUN_ID}-B`,
      );
    });

    test("filters by warehouse", async () => {
      const { status, body } = await request<{
        data: StorageSpaceRow[];
        pagination: Pagination;
      }>(
        "GET",
        `/api/storage-spaces?search=${RUN_SEARCH}&warehouseId=${warehouseH2.id}`,
      );

      expect(status).toBe(200);
      expect(body.pagination.total).toBe(0);
    });

    test("returns the full unpaged list without query params", async () => {
      const { status, body } = await request<{
        data: StorageSpaceRow[];
        pagination?: Pagination;
      }>("GET", "/api/storage-spaces");

      expect(status).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeUndefined();

      const codes = body.data.map(
        (row) => row.code,
      );

      expect(codes).toContain(`SP-${RUN_ID}-A`);
    });

    test("rejects invalid filters", async () => {
      const { status, body } =
        await request<ApiError>(
          "GET",
          "/api/storage-spaces?page=1&status=NOPE",
        );

      expect(status).toBe(400);
      expect(body.error.code).toBe(
        "VALIDATION_ERROR",
      );
    });
  });
});
