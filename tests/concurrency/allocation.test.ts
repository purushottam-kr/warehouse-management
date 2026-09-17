import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  allocate,
  cleanup,
  closePool,
  getAllocationsForItem,
  RUN_ID,
  seedItem,
  seedStorageSpace,
  seedUser,
  seedWarehouse,
  trackUser,
  type AllocationErrorBody,
  type AllocationResponseBody,
  type TestItem,
  type TestUser,
  type TestWarehouse,
} from "../integration/helpers";

type AllocationOutcome = {
  index: number;

  requestedQuantity: number;

  status: number;

  errorCode: string | null;

  allocatedQuantity: number;
};

const storageTypeFor = (key: string): string => {
  return `COLD-${RUN_ID.toUpperCase()}-${key}`;
};

const runConcurrentAllocations = async (
  itemId: string,
  quantities: string[],
): Promise<AllocationOutcome[]> => {
  const requests = quantities.map(
    async (quantity, index): Promise<AllocationOutcome> => {
      const { status, body } = (await allocate(
        itemId,
        quantity,
      )) as {
        status: number;
        body:
          | AllocationResponseBody
          | AllocationErrorBody;
      };

      if (status === 201) {
        const allocated = (
          body as AllocationResponseBody
        ).allocations.reduce(
          (sum, allocation) =>
            sum + Number(allocation.quantity),
          0,
        );

        return {
          index,
          requestedQuantity: Number(quantity),
          status,
          errorCode: null,
          allocatedQuantity: allocated,
        };
      }

      return {
        index,
        requestedQuantity: Number(quantity),
        status,
        errorCode: (body as AllocationErrorBody)
          .error.code,
        allocatedQuantity: 0,
      };
    },
  );

  return Promise.all(requests);
};

const getAllocatedTotal = async (
  itemId: string,
): Promise<number> => {
  const rows =
    await getAllocationsForItem(itemId);

  return rows.reduce(
    (sum, row) => sum + Number(row.quantity),
    0,
  );
};

describe("POST /api/allocations (concurrency)", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await seedUser();

    trackUser(user.id);
  });

  afterAll(async () => {
    await cleanup();

    await closePool();
  });

  test("1. one request wins when concurrent requests exceed capacity", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("CN-01");

    await seedStorageSpace(
      warehouse.id,
      "CN-01-A",
      "100",
      storageTypeFor("CN01"),
    );

    const item: TestItem = await seedItem(
      "CN-01",
      storageTypeFor("CN01"),
    );

    const outcomes =
      await runConcurrentAllocations(item.id, [
        "80",
        "50",
      ]);

    const successes = outcomes.filter(
      (outcome) => outcome.status === 201,
    );

    const failures = outcomes.filter(
      (outcome) => outcome.status !== 201,
    );

    expect(successes).toHaveLength(1);

    expect(failures).toHaveLength(1);

    expect(failures[0]!.errorCode).toBe(
      "CAPACITY_EXCEEDED",
    );

    expect(
      successes[0]!.allocatedQuantity,
    ).toBe(successes[0]!.requestedQuantity);

    const finalTotal =
      await getAllocatedTotal(item.id);

    expect(finalTotal).toBeLessThanOrEqual(100);

    expect(finalTotal).toBe(
      successes[0]!.allocatedQuantity,
    );
  });

  test("2. both requests succeed when they exactly fill capacity", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("CN-02");

    await seedStorageSpace(
      warehouse.id,
      "CN-02-A",
      "100",
      storageTypeFor("CN02"),
    );

    const item: TestItem = await seedItem(
      "CN-02",
      storageTypeFor("CN02"),
    );

    const outcomes =
      await runConcurrentAllocations(item.id, [
        "50",
        "50",
      ]);

    for (const outcome of outcomes) {
      expect(outcome.status).toBe(201);

      expect(outcome.allocatedQuantity).toBe(50);
    }

    const finalTotal =
      await getAllocatedTotal(item.id);

    expect(finalTotal).toBe(100);
  });

  test("3. two of three competing requests succeed", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("CN-03");

    await seedStorageSpace(
      warehouse.id,
      "CN-03-A",
      "100",
      storageTypeFor("CN03"),
    );

    const item: TestItem = await seedItem(
      "CN-03",
      storageTypeFor("CN03"),
    );

    const outcomes =
      await runConcurrentAllocations(item.id, [
        "40",
        "40",
        "40",
      ]);

    const successes = outcomes.filter(
      (outcome) => outcome.status === 201,
    );

    const failures = outcomes.filter(
      (outcome) => outcome.status !== 201,
    );

    expect(successes).toHaveLength(2);

    expect(failures).toHaveLength(1);

    expect(failures[0]!.errorCode).toBe(
      "CAPACITY_EXCEEDED",
    );

    const finalTotal =
      await getAllocatedTotal(item.id);

    expect(finalTotal).toBe(80);
  });

  test("4. concurrent requests across multiple spaces never exceed combined capacity", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("CN-04");

    await seedStorageSpace(
      warehouse.id,
      "CN-04-A",
      "60",
      storageTypeFor("CN04"),
    );

    await seedStorageSpace(
      warehouse.id,
      "CN-04-B",
      "60",
      storageTypeFor("CN04"),
    );

    const item: TestItem = await seedItem(
      "CN-04",
      storageTypeFor("CN04"),
    );

    const outcomes =
      await runConcurrentAllocations(item.id, [
        "100",
        "50",
      ]);

    const successes = outcomes.filter(
      (outcome) => outcome.status === 201,
    );

    expect(successes.length).toBeGreaterThanOrEqual(
      1,
    );

    for (const outcome of successes) {
      expect(outcome.allocatedQuantity).toBe(
        outcome.requestedQuantity,
      );
    }

    const finalTotal =
      await getAllocatedTotal(item.id);

    expect(finalTotal).toBeLessThanOrEqual(120);

    expect(finalTotal).toBe(
      successes.reduce(
        (sum, outcome) =>
          sum + outcome.allocatedQuantity,
        0,
      ),
    );
  });

  test("5. repeated concurrent contention never over-allocates", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("CN-05");

    await seedStorageSpace(
      warehouse.id,
      "CN-05-A",
      "100",
      storageTypeFor("CN05"),
    );

    const item: TestItem = await seedItem(
      "CN-05",
      storageTypeFor("CN05"),
    );

    const outcomes =
      await runConcurrentAllocations(item.id, [
        "30",
        "30",
        "30",
        "30",
        "30",
      ]);

    const successes = outcomes.filter(
      (outcome) => outcome.status === 201,
    );

    const failures = outcomes.filter(
      (outcome) => outcome.status !== 201,
    );

    expect(successes.length).toBeGreaterThanOrEqual(
      1,
    );

    expect(failures.length).toBeGreaterThanOrEqual(
      1,
    );

    for (const outcome of successes) {
      expect(outcome.allocatedQuantity).toBe(30);
    }

    const successSum = successes.reduce(
      (sum, outcome) =>
        sum + outcome.allocatedQuantity,
      0,
    );

    expect(successSum).toBeLessThanOrEqual(100);

    const finalTotal =
      await getAllocatedTotal(item.id);

    expect(finalTotal).toBe(successSum);

    expect(finalTotal).toBeLessThanOrEqual(100);
  });
});
