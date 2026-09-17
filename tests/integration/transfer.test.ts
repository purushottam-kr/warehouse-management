import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  cleanup,
  closePool,
  getAllocationsForItem,
  getMovementsForItem,
  RUN_ID,
  seedAllocation,
  seedItem,
  seedStorageSpace,
  seedUser,
  seedWarehouse,
  setStorageSpaceStatus,
  setWarehouseStatus,
  trackUser,
  transfer,
  type TestItem,
  type TestStorageSpace,
  type TestUser,
  type TestWarehouse,
  type TransferErrorBody,
  type TransferResponseBody,
} from "./helpers";

const storageTypeFor = (key: string): string => {
  return `COLD-${RUN_ID.toUpperCase()}-${key}`;
};

const ambientTypeFor = (key: string): string => {
  return `AMBIENT-${RUN_ID.toUpperCase()}-${key}`;
};

const getAllocationForSpace = async (
  itemId: string,
  storageSpaceId: string,
): Promise<string | null> => {
  const rows =
    await getAllocationsForItem(itemId);

  const row = rows.find(
    (candidate) =>
      candidate.storage_space_id ===
      storageSpaceId,
  );

  return row ? row.quantity : null;
};

const getMoveMovements = async (
  itemId: string,
): Promise<number> => {
  const movements =
    await getMovementsForItem(itemId);

  return movements.filter(
    (movement) => movement.type === "MOVE",
  ).length;
};

describe("POST /api/transfers (integration)", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await seedUser();

    trackUser(user.id);
  });

  afterAll(async () => {
    await cleanup();

    await closePool();
  });

  test("1. transfers partially from source to destination", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TR-01");

    const source: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-01-S",
        "500",
        storageTypeFor("TR01"),
      );

    const destination: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-01-D",
        "500",
        storageTypeFor("TR01"),
      );

    const item: TestItem = await seedItem(
      "TR-01",
      storageTypeFor("TR01"),
    );

    await seedAllocation(item.id, source.id, "300");

    const { status, body } = (await transfer(
      item.id,
      source.id,
      destination.id,
      "200",
    )) as {
      status: number;
      body: TransferResponseBody;
    };

    expect(status).toBe(201);

    expect(body.itemId).toBe(item.id);

    expect(body.fromStorageSpaceId).toBe(
      source.id,
    );

    expect(body.toStorageSpaceId).toBe(
      destination.id,
    );

    expect(body.quantity).toBe("200.000");

    expect(
      await getAllocationForSpace(
        item.id,
        source.id,
      ),
    ).toBe("100.000");

    expect(
      await getAllocationForSpace(
        item.id,
        destination.id,
      ),
    ).toBe("200.000");
  });

  test("2. transferring the entire source allocation removes it", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TR-02");

    const source: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-02-S",
        "500",
        storageTypeFor("TR02"),
      );

    const destination: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-02-D",
        "500",
        storageTypeFor("TR02"),
      );

    const item: TestItem = await seedItem(
      "TR-02",
      storageTypeFor("TR02"),
    );

    await seedAllocation(item.id, source.id, "300");

    const { status } = (await transfer(
      item.id,
      source.id,
      destination.id,
      "300",
    )) as {
      status: number;
      body: TransferResponseBody;
    };

    expect(status).toBe(201);

    expect(
      await getAllocationForSpace(
        item.id,
        source.id,
      ),
    ).toBeNull();

    expect(
      await getAllocationForSpace(
        item.id,
        destination.id,
      ),
    ).toBe("300.000");
  });

  test("3. merges quantities when destination already holds the same item", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TR-03");

    const source: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-03-S",
        "500",
        storageTypeFor("TR03"),
      );

    const destination: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-03-D",
        "500",
        storageTypeFor("TR03"),
      );

    const item: TestItem = await seedItem(
      "TR-03",
      storageTypeFor("TR03"),
    );

    await seedAllocation(item.id, source.id, "200");

    await seedAllocation(
      item.id,
      destination.id,
      "100",
    );

    const { status } = (await transfer(
      item.id,
      source.id,
      destination.id,
      "150",
    )) as {
      status: number;
      body: TransferResponseBody;
    };

    expect(status).toBe(201);

    const destinationRows =
      await getAllocationsForItem(item.id);

    const destinationRowsForSpace =
      destinationRows.filter(
        (row) =>
          row.storage_space_id ===
          destination.id,
      );

    expect(
      destinationRowsForSpace,
    ).toHaveLength(1);

    expect(
      destinationRowsForSpace[0]!.quantity,
    ).toBe("250.000");

    expect(
      await getAllocationForSpace(
        item.id,
        source.id,
      ),
    ).toBe("50.000");
  });

  test("4. transfers across warehouses", async () => {
    const sourceWarehouse: TestWarehouse =
      await seedWarehouse("TR-04-A");

    const destinationWarehouse: TestWarehouse =
      await seedWarehouse("TR-04-B");

    const source: TestStorageSpace =
      await seedStorageSpace(
        sourceWarehouse.id,
        "TR-04-S",
        "500",
        storageTypeFor("TR04"),
      );

    const destination: TestStorageSpace =
      await seedStorageSpace(
        destinationWarehouse.id,
        "TR-04-D",
        "500",
        storageTypeFor("TR04"),
      );

    const item: TestItem = await seedItem(
      "TR-04",
      storageTypeFor("TR04"),
    );

    await seedAllocation(item.id, source.id, "120");

    const { status } = (await transfer(
      item.id,
      source.id,
      destination.id,
      "120",
    )) as {
      status: number;
      body: TransferResponseBody;
    };

    expect(status).toBe(201);

    expect(
      await getAllocationForSpace(
        item.id,
        source.id,
      ),
    ).toBeNull();

    expect(
      await getAllocationForSpace(
        item.id,
        destination.id,
      ),
    ).toBe("120.000");
  });

  test("5. rejects insufficient source inventory and rolls back", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TR-05");

    const source: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-05-S",
        "500",
        storageTypeFor("TR05"),
      );

    const destination: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-05-D",
        "500",
        storageTypeFor("TR05"),
      );

    const item: TestItem = await seedItem(
      "TR-05",
      storageTypeFor("TR05"),
    );

    await seedAllocation(item.id, source.id, "100");

    const { status, body } = (await transfer(
      item.id,
      source.id,
      destination.id,
      "150",
    )) as {
      status: number;
      body: TransferErrorBody;
    };

    expect(status).toBe(409);

    expect(body.error.code).toBe(
      "INSUFFICIENT_SOURCE_INVENTORY",
    );

    expect(
      await getAllocationForSpace(
        item.id,
        source.id,
      ),
    ).toBe("100.000");

    expect(
      await getAllocationForSpace(
        item.id,
        destination.id,
      ),
    ).toBeNull();

    expect(
      await getMoveMovements(item.id),
    ).toBe(0);
  });

  test("6. rejects when destination capacity is insufficient and rolls back", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TR-06");

    const source: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-06-S",
        "500",
        storageTypeFor("TR06"),
      );

    const destination: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-06-D",
        "100",
        storageTypeFor("TR06"),
      );

    const item: TestItem = await seedItem(
      "TR-06",
      storageTypeFor("TR06"),
    );

    await seedAllocation(item.id, source.id, "300");

    const { status, body } = (await transfer(
      item.id,
      source.id,
      destination.id,
      "150",
    )) as {
      status: number;
      body: TransferErrorBody;
    };

    expect(status).toBe(409);

    expect(body.error.code).toBe(
      "DESTINATION_CAPACITY_EXCEEDED",
    );

    expect(
      await getAllocationForSpace(
        item.id,
        source.id,
      ),
    ).toBe("300.000");

    expect(
      await getAllocationForSpace(
        item.id,
        destination.id,
      ),
    ).toBeNull();

    expect(
      await getMoveMovements(item.id),
    ).toBe(0);
  });

  test("7. rejects destination storage type mismatch and rolls back", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TR-07");

    const source: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-07-S",
        "500",
        storageTypeFor("TR07"),
      );

    const destination: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-07-D",
        "500",
        ambientTypeFor("TR07"),
      );

    const item: TestItem = await seedItem(
      "TR-07",
      storageTypeFor("TR07"),
    );

    await seedAllocation(item.id, source.id, "100");

    const { status, body } = (await transfer(
      item.id,
      source.id,
      destination.id,
      "50",
    )) as {
      status: number;
      body: TransferErrorBody;
    };

    expect(status).toBe(409);

    expect(body.error.code).toBe(
      "STORAGE_TYPE_MISMATCH",
    );

    expect(
      await getAllocationForSpace(
        item.id,
        source.id,
      ),
    ).toBe("100.000");

    expect(
      await getAllocationForSpace(
        item.id,
        destination.id,
      ),
    ).toBeNull();

    expect(
      await getMoveMovements(item.id),
    ).toBe(0);
  });

  test("8. rejects when the destination warehouse is inactive", async () => {
    const sourceWarehouse: TestWarehouse =
      await seedWarehouse("TR-08-A");

    const destinationWarehouse: TestWarehouse =
      await seedWarehouse("TR-08-B");

    const source: TestStorageSpace =
      await seedStorageSpace(
        sourceWarehouse.id,
        "TR-08-S",
        "500",
        storageTypeFor("TR08"),
      );

    const destination: TestStorageSpace =
      await seedStorageSpace(
        destinationWarehouse.id,
        "TR-08-D",
        "500",
        storageTypeFor("TR08"),
      );

    const item: TestItem = await seedItem(
      "TR-08",
      storageTypeFor("TR08"),
    );

    await seedAllocation(item.id, source.id, "100");

    await setWarehouseStatus(
      destinationWarehouse.id,
      "INACTIVE",
    );

    const { status, body } = (await transfer(
      item.id,
      source.id,
      destination.id,
      "50",
    )) as {
      status: number;
      body: TransferErrorBody;
    };

    expect(status).toBe(409);

    expect(body.error.code).toBe(
      "DESTINATION_WAREHOUSE_INACTIVE",
    );

    expect(
      await getAllocationForSpace(
        item.id,
        source.id,
      ),
    ).toBe("100.000");

    expect(
      await getAllocationForSpace(
        item.id,
        destination.id,
      ),
    ).toBeNull();

    expect(
      await getMoveMovements(item.id),
    ).toBe(0);
  });

  test("9. rejects when the destination storage space is inactive", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TR-09");

    const source: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-09-S",
        "500",
        storageTypeFor("TR09"),
      );

    const destination: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-09-D",
        "500",
        storageTypeFor("TR09"),
      );

    const item: TestItem = await seedItem(
      "TR-09",
      storageTypeFor("TR09"),
    );

    await seedAllocation(item.id, source.id, "100");

    await setStorageSpaceStatus(
      destination.id,
      "INACTIVE",
    );

    const { status, body } = (await transfer(
      item.id,
      source.id,
      destination.id,
      "50",
    )) as {
      status: number;
      body: TransferErrorBody;
    };

    expect(status).toBe(409);

    expect(body.error.code).toBe(
      "DESTINATION_STORAGE_SPACE_INACTIVE",
    );

    expect(
      await getAllocationForSpace(
        item.id,
        source.id,
      ),
    ).toBe("100.000");

    expect(
      await getAllocationForSpace(
        item.id,
        destination.id,
      ),
    ).toBeNull();

    expect(
      await getMoveMovements(item.id),
    ).toBe(0);
  });

  test("10. successful transfer records a MOVE movement with correct data", async () => {
    const warehouse: TestWarehouse =
      await seedWarehouse("TR-10");

    const source: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-10-S",
        "500",
        storageTypeFor("TR10"),
      );

    const destination: TestStorageSpace =
      await seedStorageSpace(
        warehouse.id,
        "TR-10-D",
        "500",
        storageTypeFor("TR10"),
      );

    const item: TestItem = await seedItem(
      "TR-10",
      storageTypeFor("TR10"),
    );

    await seedAllocation(item.id, source.id, "80");

    const { status } = (await transfer(
      item.id,
      source.id,
      destination.id,
      "30",
    )) as {
      status: number;
      body: TransferResponseBody;
    };

    expect(status).toBe(201);

    const movements =
      await getMovementsForItem(item.id);

    const moveMovements = movements.filter(
      (movement) => movement.type === "MOVE",
    );

    expect(moveMovements).toHaveLength(1);

    const movement = moveMovements[0]!;

    expect(movement.quantity).toBe("30.000");

    expect(
      movement.from_storage_space_id,
    ).toBe(source.id);

    expect(movement.to_storage_space_id).toBe(
      destination.id,
    );

    expect(movement.created_by).toBe(user.id);
  });
});
