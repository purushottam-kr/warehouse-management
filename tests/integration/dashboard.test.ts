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
  trackUser,
  RUN_ID,
  type TestItem,
  type TestStorageSpace,
  type TestUser,
  type TestWarehouse,
} from "./helpers";
import type { DashboardOverview } from "@/types/dashboard";

const storageTypeFor = (key: string): string => {
  return `DASHBOARD-${RUN_ID.toUpperCase()}-${key}`;
};

describe("GET /api/dashboard (integration)", () => {
  let user: TestUser;
  let warehouse: TestWarehouse;
  let storageSpace: TestStorageSpace;
  let item: TestItem;

  beforeAll(async () => {
    user = await seedUser();
    trackUser(user.id);

    warehouse = await seedWarehouse("DB1");
    storageSpace = await seedStorageSpace(
      warehouse.id,
      "DB1A",
      "1000",
      storageTypeFor("DB1"),
    );

    item = await seedItem("DB1", storageTypeFor("DB1"));

    await allocate(item.id, "800");
  });

  afterAll(async () => {
    await cleanup();
    await closePool();
  });

  test("requires authentication", async () => {
    const response = await fetch(
      `${process.env.TEST_BASE_URL ?? "http://localhost:3100"}/api/dashboard`,
    );

    expect(response.status).toBe(401);
  });

  test("returns complete operational overview aggregation data", async () => {
    const { status, body } = await request<{ data: DashboardOverview }>(
      "GET",
      "/api/dashboard",
    );

    expect(status).toBe(200);
    expect(body.data).toBeDefined();

    const { summary, warehouseCapacities, lowCapacityAlerts, recentActivity } =
      body.data;

    // 1. Inventory Summary checks
    expect(summary.totalWarehouses).toBeGreaterThanOrEqual(1);
    expect(summary.activeWarehouses).toBeGreaterThanOrEqual(1);
    expect(summary.totalItems).toBeGreaterThanOrEqual(1);
    expect(summary.itemsWithInventory).toBeGreaterThanOrEqual(1);
    expect(summary.totalStorageSpaces).toBeGreaterThanOrEqual(1);
    expect(summary.activeStorageSpaces).toBeGreaterThanOrEqual(1);

    // 2. Warehouse capacity checks
    const targetWarehouse = warehouseCapacities.find(
      (w) => w.id === warehouse.id,
    );
    expect(targetWarehouse).toBeDefined();
    expect(targetWarehouse?.code).toBe(warehouse.code);

    // 3. Low-capacity alert checks
    const targetAlert = lowCapacityAlerts.find(
      (a) => a.id === warehouse.id || a.id === storageSpace.id,
    );
    expect(targetAlert).toBeDefined();
    expect(targetAlert?.capacityPercentage).toBeGreaterThanOrEqual(75);

    // 4. Recent activity checks
    expect(Array.isArray(recentActivity)).toBe(true);
    expect(recentActivity.length).toBeGreaterThanOrEqual(1);
    const seededMovement = recentActivity.find(
      (m) => m.item.sku === item.sku,
    );
    expect(seededMovement).toBeDefined();
    expect(seededMovement?.type).toBe("ALLOCATE");
  });
});
