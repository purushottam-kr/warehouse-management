import "server-only";

import {
  and,
  asc,
  eq,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  aisles,
  allocations,
  bays,
  items,
  layers,
  storageSpaces,
  warehouses,
} from "@/db/schema";

type DbTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

/*
 * Step 6: warehouse membership resolves through the
 * physical hierarchy (space -> layer -> bay -> aisle ->
 * warehouse). The `layer_id IS NULL` branch is
 * transition-only: it keeps legacy-shaped rows (not yet
 * backfilled) attributed exactly as before. Finalize
 * drops it along with the warehouse_id column.
 *
 * Dual-write guarantees both branches agree on the same
 * warehouse, so a space matches exactly one row.
 */
const warehouseMembershipCondition = or(
  eq(aisles.warehouseId, warehouses.id),
  and(
    isNull(storageSpaces.layerId),
    eq(storageSpaces.warehouseId, warehouses.id),
  ),
);

export const createAllocationRepository = (
  database: typeof db = db,
) => {
  const findByItemAndStorageSpace = async (
    itemId: string,
    storageSpaceId: string,
    transaction?: DbTransaction,
  ) => {
    const executor = transaction ?? database;

    const [allocation] = await executor
      .select()
      .from(allocations)
      .where(
        and(
          eq(allocations.itemId, itemId),
          eq(
            allocations.storageSpaceId,
            storageSpaceId,
          ),
        ),
      )
      .limit(1);

    return allocation ?? null;
  };

  const getAllocatedQuantityForStorageSpace =
    async (
      storageSpaceId: string,
      transaction?: DbTransaction,
    ) => {
      const executor = transaction ?? database;

      const [result] = await executor
        .select({
          total: sql<string>`
            COALESCE(
              SUM(${allocations.quantity}),
              0
            )
          `,
        })
        .from(allocations)
        .where(
          eq(
            allocations.storageSpaceId,
            storageSpaceId,
          ),
        );

      return result.total;
    };

  const getAllocatedQuantityForItem =
    async (
      itemId: string,
      transaction?: DbTransaction,
    ) => {
      const executor = transaction ?? database;

      const [result] = await executor
        .select({
          total: sql<string>`
            COALESCE(
              SUM(${allocations.quantity}),
              0
            )
          `,
        })
        .from(allocations)
        .where(eq(allocations.itemId, itemId));

      return result.total;
    };

  /*
   * Candidate discovery only.
   *
   * This result is NOT authoritative for capacity.
   * The final capacity check happens after the relevant
   * rows have been locked inside the transaction.
   */
  const findEligibleStorageSpaces = async (
    requiredStorageType: string | null,
  ) => {
    const allocatedQuantity = sql<string>`
      COALESCE(
        SUM(${allocations.quantity}),
        0
      )
    `;

    const availableCapacity = sql<string>`
      ${storageSpaces.capacity}
      -
      COALESCE(
        SUM(${allocations.quantity}),
        0
      )
    `;

    /*
     * Aggregate conditions must live in HAVING, not WHERE.
     * WHERE is evaluated before grouping, so SUM(...) is
     * not available there.
     */
    const conditions = [
      eq(storageSpaces.status, "ACTIVE"),
      eq(warehouses.status, "ACTIVE"),
      sql`${warehouses.deletedAt} IS NULL`,
    ];

    if (requiredStorageType !== null) {
      conditions.push(
        eq(
          storageSpaces.storageType,
          requiredStorageType,
        ),
      );
    }

    return database
      .select({
        storageSpaceId: storageSpaces.id,
        warehouseId: storageSpaces.warehouseId,
        capacity: storageSpaces.capacity,
        allocatedQuantity,
        availableCapacity,
        storageType: storageSpaces.storageType,
      })
      .from(storageSpaces)
      .leftJoin(
        layers,
        eq(storageSpaces.layerId, layers.id),
      )
      .leftJoin(bays, eq(layers.bayId, bays.id))
      .leftJoin(aisles, eq(bays.aisleId, aisles.id))
      .innerJoin(
        warehouses,
        warehouseMembershipCondition,
      )
      .leftJoin(
        allocations,
        eq(
          allocations.storageSpaceId,
          storageSpaces.id,
        ),
      )
      .where(and(...conditions))
      .groupBy(
        storageSpaces.id,
        storageSpaces.warehouseId,
        storageSpaces.capacity,
        storageSpaces.storageType,
      )
      .having(
        sql`${availableCapacity} > 0`,
      )
      .orderBy(
        asc(storageSpaces.warehouseId),
        asc(storageSpaces.id),
      );
  };

  /*
   * Per-item inventory breakdown.
   *
   * One row per storage space holding this item, with the
   * summed allocation quantity as an exact decimal string.
   *
   * Step 8: aisle/bay/layer segments ride along for the
   * full-path display (LEFT JOINs — null for legacy
   * rows). Every non-aggregated select appears in the
   * GROUP BY below.
   */
  const getItemAllocationBreakdown = async (
    itemId: string,
  ) => {
    return database
      .select({
        storageSpaceId: storageSpaces.id,
        storageSpaceName: storageSpaces.name,
        storageSpaceCode: storageSpaces.code,
        storageType: storageSpaces.storageType,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
        aisleName: aisles.name,
        aisleCode: aisles.code,
        bayName: bays.name,
        bayCode: bays.code,
        layerName: layers.name,
        layerCode: layers.code,
        quantity: sql<string>`
          COALESCE(
            SUM(${allocations.quantity}),
            0
          )
        `,
      })
      .from(allocations)
      .innerJoin(
        storageSpaces,
        eq(
          allocations.storageSpaceId,
          storageSpaces.id,
        ),
      )
      .leftJoin(
        layers,
        eq(storageSpaces.layerId, layers.id),
      )
      .leftJoin(bays, eq(layers.bayId, bays.id))
      .leftJoin(aisles, eq(bays.aisleId, aisles.id))
      .innerJoin(
        warehouses,
        warehouseMembershipCondition,
      )
      .where(eq(allocations.itemId, itemId))
      .groupBy(
        storageSpaces.id,
        storageSpaces.name,
        storageSpaces.code,
        storageSpaces.storageType,
        warehouses.id,
        warehouses.name,
        aisles.name,
        aisles.code,
        bays.name,
        bays.code,
        layers.name,
        layers.code,
      )
      .orderBy(
        asc(storageSpaces.name),
        asc(storageSpaces.id),
      );
  };

  const getStorageSpaceInventory = async (
    storageSpaceId: string,
  ) => {
    return database
      .select({
        itemId: items.id,
        itemName: items.name,
        sku: items.sku,
        unit: items.unit,
        quantity: sql<string>`
          COALESCE(
            SUM(${allocations.quantity}),
            0
          )
        `,
      })
      .from(allocations)
      .innerJoin(items, eq(allocations.itemId, items.id))
      .where(
        eq(
          allocations.storageSpaceId,
          storageSpaceId,
        ),
      )
      .groupBy(
        items.id,
        items.name,
        items.sku,
        items.unit,
      )
      .orderBy(asc(items.name), asc(items.sku));
  };

  /*
   * Lock warehouses first.
   *
   * This prevents a concurrent warehouse status change from
   * happening while we are deciding whether inventory can be
   * received there.
   */
  const lockWarehouses = async (
    warehouseIds: string[],
    transaction: DbTransaction,
  ) => {
    if (warehouseIds.length === 0) {
      return [];
    }

    return transaction
      .select({
        id: warehouses.id,
        status: warehouses.status,
        deletedAt: warehouses.deletedAt,
      })
      .from(warehouses)
      .where(
        sql`${warehouses.id} IN (${sql.join(
          warehouseIds.map(
            (id) => sql`${id}`,
          ),
          sql`, `,
        )})`,
      )
      .orderBy(asc(warehouses.id))
      .for("update");
  };

  /*
   * Lock storage spaces in deterministic ID order.
   *
   * Every allocation transaction should use the same ordering
   * to reduce deadlock risk.
   */
  const lockStorageSpaces = async (
    storageSpaceIds: string[],
    transaction: DbTransaction,
  ) => {
    if (storageSpaceIds.length === 0) {
      return [];
    }

    return transaction
      .select({
        id: storageSpaces.id,
        warehouseId: storageSpaces.warehouseId,
        capacity: storageSpaces.capacity,
        storageType: storageSpaces.storageType,
        status: storageSpaces.status,
      })
      .from(storageSpaces)
      .where(
        sql`${storageSpaces.id} IN (${sql.join(
          storageSpaceIds.map(
            (id) => sql`${id}`,
          ),
          sql`, `,
        )})`,
      )
      .orderBy(asc(storageSpaces.id))
      .for("update");
  };

  const getAllocatedQuantitiesForStorageSpaces =
    async (
      storageSpaceIds: string[],
      transaction: DbTransaction,
    ) => {
      if (storageSpaceIds.length === 0) {
        return new Map<string, string>();
      }

      const rows = await transaction
        .select({
          storageSpaceId:
            allocations.storageSpaceId,
          total: sql<string>`
            COALESCE(
              SUM(${allocations.quantity}),
              0
            )
          `,
        })
        .from(allocations)
        .where(
          sql`${allocations.storageSpaceId} IN (${sql.join(
            storageSpaceIds.map(
              (id) => sql`${id}`,
            ),
            sql`, `,
          )})`,
        )
        .groupBy(
          allocations.storageSpaceId,
        );

      return new Map(
        rows.map((row) => [
          row.storageSpaceId,
          row.total,
        ]),
      );
    };

  const create = async (
    itemId: string,
    storageSpaceId: string,
    quantity: string,
    transaction: DbTransaction,
  ) => {
    const [allocation] = await transaction
      .insert(allocations)
      .values({
        itemId,
        storageSpaceId,
        quantity,
      })
      .returning();

    return allocation;
  };

  const updateQuantity = async (
    id: string,
    quantity: string,
    transaction: DbTransaction,
  ) => {
    const [allocation] = await transaction
      .update(allocations)
      .set({
        quantity,
        updatedAt: new Date(),
      })
      .where(eq(allocations.id, id))
      .returning();

    return allocation ?? null;
  };

  const remove = async (
  id: string,
  transaction: DbTransaction,
) => {
  const [allocation] = await transaction
    .delete(allocations)
    .where(eq(allocations.id, id))
    .returning();

  return allocation ?? null;
};

const getAllocatedQuantityForWarehouse = async (
  warehouseId: string,
  transaction?: DbTransaction,
) => {
  const executor = transaction ?? database;

  const [result] = await executor
      .select({
        total: sql<string>`COALESCE(SUM(${allocations.quantity}), 0)`,
      })
      .from(allocations)
      .innerJoin(
        storageSpaces,
        eq(
          allocations.storageSpaceId,
          storageSpaces.id,
        ),
      )
      .leftJoin(
        layers,
        eq(storageSpaces.layerId, layers.id),
      )
      .leftJoin(bays, eq(layers.bayId, bays.id))
      .leftJoin(aisles, eq(bays.aisleId, aisles.id))
      .where(
        or(
          eq(aisles.warehouseId, warehouseId),
          and(
            isNull(storageSpaces.layerId),
            eq(storageSpaces.warehouseId, warehouseId),
          ),
        ),
      );

  return result.total;
};


  return {
    getAllocatedQuantityForWarehouse,
    findByItemAndStorageSpace,
    getAllocatedQuantityForStorageSpace,
    getAllocatedQuantityForItem,
    getItemAllocationBreakdown,
    getStorageSpaceInventory,
    findEligibleStorageSpaces,
    lockWarehouses,
    lockStorageSpaces,
    getAllocatedQuantitiesForStorageSpaces,
    create,
    updateQuantity,
    remove,
  };
};