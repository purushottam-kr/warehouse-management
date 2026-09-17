import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  allocate,
  cleanup,
  closePool,
  getAllocationsForItem,
  getMovementsForItem,
  RUN_ID,
  seedItem,
  seedStorageSpace,
  seedUser,
  seedWarehouse,
  setStorageSpaceStatus,
  setWarehouseStatus,
  trackUser,
  type AllocationErrorBody,
  type AllocationResponseBody,
  type TestItem,
  type TestStorageSpace,
  type TestUser,
  type TestWarehouse,
} from "./helpers";

const storageTypeFor = (key: string): string => {
  return `COLD-${RUN_ID.toUpperCase()}-${key}`;
};

const ambientTypeFor = (key: string): string => {
  return `AMBIENT-${RUN_ID.toUpperCase()}-${key}`;
};

describe("POST /api/allocations (integration)", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await seedUser();

    trackUser(user.id);
  });

  afterAll(async () => {
    await cleanup();

    await closePool();
  });

  test("1. allocates an item to one storage space", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("01");

    const space: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "01",
        "1000",
        storageTypeFor("01"),
      );

    const item: TestItem = await seedItem(
      "01",
      storageTypeFor("01"),
    );

    const { status, body } = await allocate(
      item.id,
      "50",
    ) as {
      status: number;
      body: AllocationResponseBody;
    };

    expect(status).toBe(201);

    expect(body.itemId).toBe(item.id);

    expect(body.requestedQuantity).toBe("50");

    expect(body.allocations).toEqual([
      {
        storageSpaceId: space.id,
        quantity: "50.000",
      },
    ]);

    const rows =
      await getAllocationsForItem(item.id);

    expect(rows).toHaveLength(1);

    expect(rows[0]!.storage_space_id).toBe(
      space.id,
    );

    expect(rows[0]!.quantity).toBe("50.000");
  });

  test("2. splits quantity across multiple storage spaces", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("02");

    const bigSpace: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "02-A",
        "1000",
        storageTypeFor("02"),
      );

    const smallSpace: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "02-B",
        "500",
        storageTypeFor("02"),
      );

    const item: TestItem = await seedItem(
      "02",
      storageTypeFor("02"),
    );

    const { status, body } = await allocate(
      item.id,
      "1200",
    ) as {
      status: number;
      body: AllocationResponseBody;
    };

    expect(status).toBe(201);

    expect(body.requestedQuantity).toBe("1200");

    expect(body.allocations).toHaveLength(2);

    const total = body.allocations.reduce(
      (sum, allocation) =>
        sum + Number(allocation.quantity),
      0,
    );

    expect(total).toBe(1200);

    const bigAllocation = body.allocations.find(
      (allocation) =>
        allocation.storageSpaceId === bigSpace.id,
    );

    const smallAllocation = body.allocations.find(
      (allocation) =>
        allocation.storageSpaceId ===
        smallSpace.id,
    );

    expect(bigAllocation).toBeDefined();

    expect(smallAllocation).toBeDefined();

    expect(
      Number(bigAllocation!.quantity),
    ).toBeLessThanOrEqual(1000);

    expect(
      Number(smallAllocation!.quantity),
    ).toBeLessThanOrEqual(500);

    expect(
      Number(bigAllocation!.quantity),
    ).toBeGreaterThan(0);

    expect(
      Number(smallAllocation!.quantity),
    ).toBeGreaterThan(0);
  });

  test("3. rejects when total capacity is insufficient and commits nothing", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("03");

    await seedStorageSpace(
      warehouse.id,
      "03-A",
      "500",
      storageTypeFor("03"),
    );

    await seedStorageSpace(
      warehouse.id,
      "03-B",
      "200",
      storageTypeFor("03"),
    );

    const item: TestItem = await seedItem(
      "03",
      storageTypeFor("03"),
    );

    const { status, body } = await allocate(
      item.id,
      "800",
    ) as {
      status: number;
      body: AllocationErrorBody;
    };

    expect(status).toBe(409);

    expect(body.error.code).toBe(
      "CAPACITY_EXCEEDED",
    );

    const allocations =
      await getAllocationsForItem(item.id);

    expect(allocations).toHaveLength(0);

    const movements =
      await getMovementsForItem(item.id);

    expect(movements).toHaveLength(0);
  });

  test("4. rejects when storage type does not match", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("04");

    await seedStorageSpace(
      warehouse.id,
      "04-A",
      "500",
      ambientTypeFor("04"),
    );

    const item: TestItem = await seedItem(
      "04",
      storageTypeFor("04"),
    );

    const { status, body } = await allocate(
      item.id,
      "100",
    ) as {
      status: number;
      body: AllocationErrorBody;
    };

    expect(status).toBe(409);

    expect(body.error.code).toBe(
      "NO_ELIGIBLE_STORAGE_SPACE",
    );

    const allocations =
      await getAllocationsForItem(item.id);

    expect(allocations).toHaveLength(0);

    const movements =
      await getMovementsForItem(item.id);

    expect(movements).toHaveLength(0);
  });

  test("5. rejects when the warehouse is inactive", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("05");

    await seedStorageSpace(
      warehouse.id,
      "05-A",
      "500",
      storageTypeFor("05"),
    );

    const item: TestItem = await seedItem(
      "05",
      storageTypeFor("05"),
    );

    await setWarehouseStatus(
      warehouse.id,
      "INACTIVE",
    );

    const { status, body } = await allocate(
      item.id,
      "100",
    ) as {
      status: number;
      body: AllocationErrorBody;
    };

    expect(status).toBe(409);

    expect(body.error.code).toBe(
      "NO_ELIGIBLE_STORAGE_SPACE",
    );

    const allocations =
      await getAllocationsForItem(item.id);

    expect(allocations).toHaveLength(0);

    const movements =
      await getMovementsForItem(item.id);

    expect(movements).toHaveLength(0);
  });

  test("6. rejects when the storage space is inactive", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("06");

    const space: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "06-A",
        "500",
        storageTypeFor("06"),
      );

    const item: TestItem = await seedItem(
      "06",
      storageTypeFor("06"),
    );

    await setStorageSpaceStatus(
      space.id,
      "INACTIVE",
    );

    const { status, body } = await allocate(
      item.id,
      "100",
    ) as {
      status: number;
      body: AllocationErrorBody;
    };

    expect(status).toBe(409);

    expect(body.error.code).toBe(
      "NO_ELIGIBLE_STORAGE_SPACE",
    );

    const allocations =
      await getAllocationsForItem(item.id);

    expect(allocations).toHaveLength(0);

    const movements =
      await getMovementsForItem(item.id);

    expect(movements).toHaveLength(0);
  });

  test("7. updates the existing allocation for the same item and space", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("07");

    const space: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "07-A",
        "1000",
        storageTypeFor("07"),
      );

    const item: TestItem = await seedItem(
      "07",
      storageTypeFor("07"),
    );

    const first = await allocate(
      item.id,
      "100",
    ) as {
      status: number;
      body: AllocationResponseBody;
    };

    expect(first.status).toBe(201);

    const second = await allocate(
      item.id,
      "150",
    ) as {
      status: number;
      body: AllocationResponseBody;
    };

    expect(second.status).toBe(201);

    expect(second.body.allocations).toEqual([
      {
        storageSpaceId: space.id,
        quantity: "150.000",
      },
    ]);

    const rows =
      await getAllocationsForItem(item.id);

    expect(rows).toHaveLength(1);

    expect(rows[0]!.storage_space_id).toBe(
      space.id,
    );

    expect(rows[0]!.quantity).toBe("250.000");
  });

  test("8. records an ALLOCATE movement with correct data", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("08");

    const space: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "08-A",
        "300",
        storageTypeFor("08"),
      );

    const item: TestItem = await seedItem(
      "08",
      storageTypeFor("08"),
    );

    const { status } = await allocate(
      item.id,
      "25",
    );

    expect(status).toBe(201);

    const movements =
      await getMovementsForItem(item.id);

    expect(movements).toHaveLength(1);

    const movement = movements[0]!;

    expect(movement.type).toBe("ALLOCATE");

    expect(movement.quantity).toBe("25.000");

    expect(movement.to_storage_space_id).toBe(
      space.id,
    );

    expect(
      movement.from_storage_space_id,
    ).toBeNull();

    expect(movement.created_by).toBe(user.id);
  });
});
