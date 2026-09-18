import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  allocate,
  cleanup,
  closePool,
  getAllocationsForItem,
  seedAllocation,
  seedItem,
  seedStorageSpace,
  seedUser,
  seedWarehouse,
  request,
  trackUser,
  RUN_ID,
} from "./helpers";

/*
 * GET /api/items/[id]/allocations integration tests.
 * Backs the item detail inventory view (UI-5C).
 */
describe("GET /api/items/[id]/allocations (smoke)", () => {
  let user: { id: string };

  beforeAll(async () => {
    user = await seedUser();

    trackUser(user.id);
  });

  afterAll(async () => {
    await cleanup();

    await closePool();
  });

  test("returns total and per-location quantities derived from allocations", async () => {
    const warehouse = await seedWarehouse("S1");

    const spaceA = await seedStorageSpace(
      warehouse.id,
      "S1A",
      "1000",
      `COLD-${RUN_ID}-SMOKE`,
    );

    const spaceB = await seedStorageSpace(
      warehouse.id,
      "S1B",
      "1000",
      `COLD-${RUN_ID}-SMOKE`,
    );

    const item = await seedItem(
      "S1",
      `COLD-${RUN_ID}-SMOKE`,
    );

    // Auto-allocation deterministically fills one space
    // (candidates are ordered by space ID), so detect
    // which space received it and seed the other to
    // exercise multi-space grouping.
    await allocate(item.id, "100");

    const allocatedRows =
      await getAllocationsForItem(item.id);

    expect(allocatedRows).toHaveLength(1);

    const allocatedSpaceId =
      allocatedRows[0]!.storage_space_id;

    const otherSpace =
      allocatedSpaceId === spaceA.id
        ? spaceB
        : spaceA;

    await seedAllocation(
      item.id,
      otherSpace.id,
      "50",
    );

    const { status, body } = await request<{
      data: {
        itemId: string;
        totalQuantity: string;
        locations: Array<{
          storageSpaceId: string;
          storageSpaceName: string;
          storageSpaceCode: string;
          storageType: string;
          warehouseId: string;
          warehouseName: string;
          quantity: string;
        }>;
      };
    }>("GET", `/api/items/${item.id}/allocations`);

    expect(status).toBe(200);

    expect(body.data.itemId).toBe(item.id);

    expect(body.data.totalQuantity).toBe("150.000");

    expect(body.data.locations).toHaveLength(2);

    const quantities = body.data.locations
      .map((location) => Number(location.quantity))
      .sort((a, b) => a - b);

    expect(quantities).toEqual([50, 100]);

    for (const location of body.data.locations) {
      expect(location.warehouseName).toBe(
        "Warehouse S1",
      );

      expect(location.storageType).toBe(
        `COLD-${RUN_ID}-SMOKE`,
      );

      expect(location.storageSpaceCode).toContain(
        "SP-",
      );
    }
  });

  test("returns zero total and no locations for an item without inventory", async () => {
    const item = await seedItem("S2", null);

    const { status, body } = await request<{
      data: {
        itemId: string;
        totalQuantity: string;
        locations: unknown[];
      };
    }>("GET", `/api/items/${item.id}/allocations`);

    expect(status).toBe(200);

    expect(body.data.totalQuantity).toBe("0");

    expect(body.data.locations).toHaveLength(0);
  });

  test("returns 404 for an unknown item", async () => {
    const { status, body } = await request<{
      error: { code: string };
    }>(
      "GET",
      "/api/items/00000000-0000-0000-0000-000000000000/allocations",
    );

    expect(status).toBe(404);

    expect(body.error.code).toBe("NOT_FOUND");
  });

  test("returns 401 without a session", async () => {
    const item = await seedItem("S3", null);

    // Issue an unauthenticated request by hitting the
    // endpoint without the session cookie captured in
    // helpers (login state is shared, so assert on a
    // fresh login-less client via direct fetch).
    const response = await fetch(
      `${process.env.TEST_BASE_URL ?? "http://localhost:3100"}/api/items/${item.id}/allocations`,
      { headers: { "Content-Type": "application/json" } },
    );

    expect(response.status).toBe(401);

    const body = (await response.json()) as {
      error: { code: string };
    };

    expect(body.error.code).toBe(
      "UNAUTHENTICATED",
    );
  });
});
