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
  release,
  request,
  seedItem,
  seedStorageSpace,
  seedUser,
  seedWarehouse,
  trackUser,
  transfer,
  RUN_ID,
  type TestItem,
  type TestStorageSpace,
  type TestUser,
  type TestWarehouse,
} from "./helpers";

type MovementRow = {
  id: string;
  type: "ALLOCATE" | "MOVE" | "RELEASE";
  quantity: string;
  createdAt: string;
  item: { id: string; sku: string; name: string; unit: string };
  from: {
    id: string;
    name: string;
    code: string;
    warehouseName: string;
  } | null;
  to: {
    id: string;
    name: string;
    code: string;
    warehouseName: string;
  } | null;
  performedBy: { id: string; name: string | null; email: string };
};

type MovementsResponse = {
  data: MovementRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const storageTypeFor = (key: string): string => {
  return `COLD-${RUN_ID.toUpperCase()}-${key}`;
};

describe("GET /api/inventory-movements (integration)", () => {
  let user: TestUser;
  let warehouse: TestWarehouse;
  let otherWarehouse: TestWarehouse;
  let spaceA: TestStorageSpace;
  let spaceB: TestStorageSpace;
  let item: TestItem;

  beforeAll(async () => {
    user = await seedUser();

    trackUser(user.id);

    warehouse = await seedWarehouse("H1");
    otherWarehouse = await seedWarehouse("H2");

    spaceA = await seedStorageSpace(
      warehouse.id,
      "H1A",
      "1000",
      storageTypeFor("H1"),
    );

    item = await seedItem(
      "H1",
      storageTypeFor("H1"),
    );

    // Builds a deterministic movement history:
    // ALLOCATE 100 -> A, MOVE 25 (A -> B), RELEASE 10 from B.
    await allocate(item.id, "100");

    spaceB = await seedStorageSpace(
      warehouse.id,
      "H1B",
      "1000",
      storageTypeFor("H1"),
    );
    await transfer(item.id, spaceA.id, spaceB.id, "25");

    const { status } = (await release(
      item.id,
      spaceB.id,
      "10",
    )) as { status: number };

    if (status !== 201) {
      throw new Error("Release seeding failed");
    }
  });

  afterAll(async () => {
    await cleanup();

    await closePool();
  });

  test("returns movements with joined details", async () => {
    const { status, body } = await request<MovementsResponse>(
      "GET",
      `/api/inventory-movements?itemId=${item.id}`,
    );

    expect(status).toBe(200);

    expect(body.pagination.total).toBe(3);

    const types = body.data.map(
      (movement) => movement.type,
    );

    // Newest first.
    expect(types).toEqual([
      "RELEASE",
      "MOVE",
      "ALLOCATE",
    ]);

    const [releaseRow, moveRow, allocateRow] =
      body.data;

    expect(releaseRow).toBeDefined();
    expect(moveRow).toBeDefined();
    expect(allocateRow).toBeDefined();

    expect(releaseRow!.item.sku).toBe(item.sku);

    expect(releaseRow!.quantity).toBe("10.000");

    expect(releaseRow!.from?.id).toBe(spaceB.id);

    expect(releaseRow!.from?.name).toBe("Space H1B");

    expect(releaseRow!.from?.warehouseName).toBe(
      "Warehouse H1",
    );

    expect(releaseRow!.to).toBeNull();

    expect(releaseRow!.performedBy.id).toBe(user.id);

    expect(moveRow!.from?.id).toBe(spaceA.id);

    expect(moveRow!.to?.id).toBe(spaceB.id);

    expect(moveRow!.quantity).toBe("25.000");

    expect(allocateRow!.type).toBe("ALLOCATE");

    expect(allocateRow!.from).toBeNull();

    expect(allocateRow!.to?.id).toBe(spaceA.id);

    expect(allocateRow!.quantity).toBe("100.000");
  });

  test("filters by movement type", async () => {
    const { status, body } = await request<MovementsResponse>(
      "GET",
      `/api/inventory-movements?itemId=${item.id}&type=MOVE`,
    );

    expect(status).toBe(200);

    expect(body.pagination.total).toBe(1);

    expect(body.data[0]!.type).toBe("MOVE");
  });

  test("searches by item SKU and name", async () => {
    const { status, body } = await request<MovementsResponse>(
      "GET",
      `/api/inventory-movements?search=${item.sku}`,
    );

    expect(status).toBe(200);

    expect(body.pagination.total).toBe(3);

    for (const movement of body.data) {
      expect(movement.item.id).toBe(item.id);
    }
  });

  test("filters by warehouse context on either side", async () => {
    const { status, body } = await request<MovementsResponse>(
      "GET",
      `/api/inventory-movements?warehouseId=${warehouse.id}&pageSize=100`,
    );

    expect(status).toBe(200);

    expect(body.pagination.total).toBe(3);

    const emptyWarehouse = await request<MovementsResponse>(
      "GET",
      `/api/inventory-movements?warehouseId=${otherWarehouse.id}`,
    );

    expect(emptyWarehouse.status).toBe(200);

    expect(emptyWarehouse.body.pagination.total).toBe(0);
  });

  test("paginates with page and pageSize", async () => {
    const firstPage = await request<MovementsResponse>(
      "GET",
      `/api/inventory-movements?itemId=${item.id}&page=1&pageSize=2`,
    );

    expect(firstPage.status).toBe(200);

    expect(firstPage.body.pagination).toEqual({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });

    expect(firstPage.body.data).toHaveLength(2);

    expect(firstPage.body.data[0]!.type).toBe(
      "RELEASE",
    );

    const secondPage = await request<MovementsResponse>(
      "GET",
      `/api/inventory-movements?itemId=${item.id}&page=2&pageSize=2`,
    );

    expect(secondPage.status).toBe(200);

    expect(secondPage.body.data).toHaveLength(1);

    expect(secondPage.body.data[0]!.type).toBe(
      "ALLOCATE",
    );

    const clampedPage = await request<MovementsResponse>(
      "GET",
      `/api/inventory-movements?itemId=${item.id}&page=99&pageSize=2`,
    );

    expect(clampedPage.status).toBe(200);

    expect(clampedPage.body.pagination.page).toBe(2);

    expect(clampedPage.body.data).toHaveLength(1);
  });

  test("rejects invalid query parameters", async () => {
    const { status, body } = await request<{
      error: { code: string };
    }>(
      "GET",
      "/api/inventory-movements?type=INVALID",
    );

    expect(status).toBe(400);

    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("requires authentication", async () => {
    const response = await fetch(
      `${process.env.TEST_BASE_URL ?? "http://localhost:3100"}/api/inventory-movements`,
    );

    expect(response.status).toBe(401);
  });
});
