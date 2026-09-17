import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  cleanup,
  closePool,
  getAllocationsForItem,
  RUN_ID,
  seedAllocation,
  seedItem,
  seedStorageSpace,
  seedUser,
  seedWarehouse,
  trackUser,
  transfer,
  type TestItem,
  type TestStorageSpace,
  type TestUser,
  type TestWarehouse,
  type TransferErrorBody,
  type TransferResponseBody,
} from "../integration/helpers";

type TransferOutcome = {
  index: number;

  requestedQuantity: number;

  status: number;

  errorCode: string | null;

  transferredQuantity: number;
};

const storageTypeFor = (key: string): string => {
  return `COLD-${RUN_ID.toUpperCase()}-${key}`;
};

const runConcurrentTransfers = async (
  itemId: string,
  specs: Array<{
    fromStorageSpaceId: string;
    toStorageSpaceId: string;
    quantity: string;
  }>,
): Promise<TransferOutcome[]> => {
  const requests = specs.map(
    async (spec, index): Promise<TransferOutcome> => {
      const { status, body } = (await transfer(
        itemId,
        spec.fromStorageSpaceId,
        spec.toStorageSpaceId,
        spec.quantity,
      )) as {
        status: number;
        body:
          | TransferResponseBody
          | TransferErrorBody;
      };

      if (status === 201) {
        return {
          index,
          requestedQuantity: Number(
            spec.quantity,
          ),
          status,
          errorCode: null,
          transferredQuantity: Number(
            (body as TransferResponseBody)
              .quantity,
          ),
        };
      }

      return {
        index,
        requestedQuantity: Number(
          spec.quantity,
        ),
        status,
        errorCode: (
          body as TransferErrorBody
        ).error.code,
        transferredQuantity: 0,
      };
    },
  );

  return Promise.all(requests);
};

const getAllocationQuantity = async (
  itemId: string,
  storageSpaceId: string,
): Promise<number> => {
  const rows =
    await getAllocationsForItem(itemId);

  const row = rows.find(
    (candidate) =>
      candidate.storage_space_id ===
      storageSpaceId,
  );

  return row ? Number(row.quantity) : 0;
};

describe("POST /api/transfers (concurrency)", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await seedUser();

    trackUser(user.id);
  });

  afterAll(async () => {
    await cleanup();

    await closePool();
  });

  test("1. concurrent transfers from the same source let only one win and never go negative", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TC-01");

    const source: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-01-S",
        "500",
        storageTypeFor("TC01"),
      );

    const destinationA: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-01-DA",
        "500",
        storageTypeFor("TC01"),
      );

    const destinationB: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-01-DB",
        "500",
        storageTypeFor("TC01"),
      );

    const item: TestItem = await seedItem(
      "TC-01",
      storageTypeFor("TC01"),
    );

    await seedAllocation(
      item.id,
      source.id,
      "100",
    );

    const outcomes =
      await runConcurrentTransfers(item.id, [
        {
          fromStorageSpaceId: source.id,
          toStorageSpaceId: destinationA.id,
          quantity: "80",
        },
        {
          fromStorageSpaceId: source.id,
          toStorageSpaceId: destinationB.id,
          quantity: "50",
        },
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
      "INSUFFICIENT_SOURCE_INVENTORY",
    );

    expect(
      successes[0]!.transferredQuantity,
    ).toBe(successes[0]!.requestedQuantity);

    const sourceQuantity =
      await getAllocationQuantity(
        item.id,
        source.id,
      );

    expect(sourceQuantity).toBeGreaterThanOrEqual(
      0,
    );

    expect(sourceQuantity).toBe(
      100 - successes[0]!.requestedQuantity,
    );
  });

  test("2. concurrent transfers into the same destination never exceed its capacity", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TC-02");

    const sourceA: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-02-SA",
        "500",
        storageTypeFor("TC02"),
      );

    const sourceB: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-02-SB",
        "500",
        storageTypeFor("TC02"),
      );

    const destination: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-02-D",
        "100",
        storageTypeFor("TC02"),
      );

    const item: TestItem = await seedItem(
      "TC-02",
      storageTypeFor("TC02"),
    );

    await seedAllocation(
      item.id,
      sourceA.id,
      "100",
    );

    await seedAllocation(
      item.id,
      sourceB.id,
      "100",
    );

    const outcomes =
      await runConcurrentTransfers(item.id, [
        {
          fromStorageSpaceId: sourceA.id,
          toStorageSpaceId: destination.id,
          quantity: "80",
        },
        {
          fromStorageSpaceId: sourceB.id,
          toStorageSpaceId: destination.id,
          quantity: "50",
        },
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
      "DESTINATION_CAPACITY_EXCEEDED",
    );

    const destinationQuantity =
      await getAllocationQuantity(
        item.id,
        destination.id,
      );

    expect(
      destinationQuantity,
    ).toBeLessThanOrEqual(100);

    expect(destinationQuantity).toBe(
      successes[0]!.transferredQuantity,
    );

    const sourceAQuantity =
      await getAllocationQuantity(
        item.id,
        sourceA.id,
      );

    const sourceBQuantity =
      await getAllocationQuantity(
        item.id,
        sourceB.id,
      );

    const expectedSourceA =
      outcomes[0]!.status === 201 ? 20 : 100;

    const expectedSourceB =
      outcomes[1]!.status === 201 ? 50 : 100;

    expect(sourceAQuantity).toBe(
      expectedSourceA,
    );

    expect(sourceBQuantity).toBe(
      expectedSourceB,
    );
  });

  test("3. multiple concurrent transfers never consume more than the source inventory", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TC-03");

    const source: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-03-S",
        "500",
        storageTypeFor("TC03"),
      );

    const destinationA: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-03-DA",
        "500",
        storageTypeFor("TC03"),
      );

    const destinationB: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-03-DB",
        "500",
        storageTypeFor("TC03"),
      );

    const destinationC: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-03-DC",
        "500",
        storageTypeFor("TC03"),
      );

    const item: TestItem = await seedItem(
      "TC-03",
      storageTypeFor("TC03"),
    );

    await seedAllocation(
      item.id,
      source.id,
      "100",
    );

    const outcomes =
      await runConcurrentTransfers(item.id, [
        {
          fromStorageSpaceId: source.id,
          toStorageSpaceId: destinationA.id,
          quantity: "40",
        },
        {
          fromStorageSpaceId: source.id,
          toStorageSpaceId: destinationB.id,
          quantity: "40",
        },
        {
          fromStorageSpaceId: source.id,
          toStorageSpaceId: destinationC.id,
          quantity: "40",
        },
      ]);

    const successes = outcomes.filter(
      (outcome) => outcome.status === 201,
    );

    const failures = outcomes.filter(
      (outcome) => outcome.status !== 201,
    );

    expect(successes.length).toBe(2);

    expect(failures).toHaveLength(1);

    expect(failures[0]!.errorCode).toBe(
      "INSUFFICIENT_SOURCE_INVENTORY",
    );

    for (const outcome of successes) {
      expect(outcome.transferredQuantity).toBe(
        40,
      );
    }

    const successSum = successes.reduce(
      (sum, outcome) =>
        sum + outcome.transferredQuantity,
      0,
    );

    expect(successSum).toBeLessThanOrEqual(100);

    const sourceQuantity =
      await getAllocationQuantity(
        item.id,
        source.id,
      );

    expect(sourceQuantity).toBe(
      100 - successSum,
    );

    expect(sourceQuantity).toBeGreaterThanOrEqual(
      0,
    );
  });

  test("4. reverse-direction concurrent transfers do not deadlock and preserve inventory", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TC-04");

    const spaceA: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-04-A",
        "500",
        storageTypeFor("TC04"),
      );

    const spaceB: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TC-04-B",
        "500",
        storageTypeFor("TC04"),
      );

    const item: TestItem = await seedItem(
      "TC-04",
      storageTypeFor("TC04"),
    );

    await seedAllocation(item.id, spaceA.id, "100");

    await seedAllocation(item.id, spaceB.id, "100");

    const outcomes =
      await runConcurrentTransfers(item.id, [
        {
          fromStorageSpaceId: spaceA.id,
          toStorageSpaceId: spaceB.id,
          quantity: "60",
        },
        {
          fromStorageSpaceId: spaceB.id,
          toStorageSpaceId: spaceA.id,
          quantity: "60",
        },
      ]);

    for (const outcome of outcomes) {
      expect(outcome.status).toBe(201);

      expect(outcome.transferredQuantity).toBe(
        60,
      );
    }

    const finalA =
      await getAllocationQuantity(
        item.id,
        spaceA.id,
      );

    const finalB =
      await getAllocationQuantity(
        item.id,
        spaceB.id,
      );

    expect(finalA).toBe(100);

    expect(finalB).toBe(100);

    expect(finalA + finalB).toBe(200);
  });
});
