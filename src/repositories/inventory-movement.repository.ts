import "server-only";

import {
  and,
  desc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  inventoryMovements,
  items,
  storageSpaces,
  users,
  warehouses,
} from "@/db/schema";
import type {
  CreateInventoryMovementInput,
  InventoryMovementType,
  MovementActivity,
} from "@/types/inventory-movement";

const fromSpace = alias(
  storageSpaces,
  "from_space",
);

const toSpace = alias(storageSpaces, "to_space");

const fromWarehouse = alias(
  warehouses,
  "from_warehouse",
);

const toWarehouse = alias(
  warehouses,
  "to_warehouse",
);

type DbTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

type ActivityFilters = {
  itemId?: string;
  type?: InventoryMovementType;
  warehouseId?: string;
  search?: string;
};

const buildActivityFilters = (
  filters: ActivityFilters,
): SQL | undefined => {
  const conditions: SQL[] = [];

  if (filters.itemId) {
    conditions.push(
      eq(inventoryMovements.itemId, filters.itemId),
    );
  }

  if (filters.type) {
    conditions.push(
      eq(inventoryMovements.type, filters.type),
    );
  }

  if (filters.warehouseId) {
    conditions.push(
      or(
        eq(
          fromSpace.warehouseId,
          filters.warehouseId,
        ),
        eq(
          toSpace.warehouseId,
          filters.warehouseId,
        ),
      ) as SQL,
    );
  }

  if (filters.search) {
    conditions.push(
      or(
        ilike(items.sku, `%${filters.search}%`),
        ilike(items.name, `%${filters.search}%`),
      ) as SQL,
    );
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return and(...conditions);
};

export const createInventoryMovementRepository = () => {
  const create = async (
    data: CreateInventoryMovementInput,
    transaction: DbTransaction,
  ) => {
    const [movement] = await transaction
      .insert(inventoryMovements)
      .values({
        itemId: data.itemId,
        type: data.type,
        quantity: data.quantity,
        fromStorageSpaceId:
          data.fromStorageSpaceId ?? null,
        toStorageSpaceId:
          data.toStorageSpaceId ?? null,
        createdBy: data.createdBy,
      })
      .returning();

    return movement;
  };

  /*
   * Total matching movements for pagination.
   *
   * Items and both space aliases are joined here
   * because every filter may reference them. The
   * acting user never appears in filters, so that
   * join is not needed for counting.
   */
  const countActivity = async (
    filters: ActivityFilters,
  ): Promise<number> => {
    const [result] = await db
      .select({
        total: sql<string>`count(*)`,
      })
      .from(inventoryMovements)
      .innerJoin(
        items,
        eq(inventoryMovements.itemId, items.id),
      )
      .leftJoin(
        fromSpace,
        eq(
          inventoryMovements.fromStorageSpaceId,
          fromSpace.id,
        ),
      )
      .leftJoin(
        toSpace,
        eq(
          inventoryMovements.toStorageSpaceId,
          toSpace.id,
        ),
      )
      .where(buildActivityFilters(filters));

    return Number(result.total);
  };

  const findActivity = async (
    filters: ActivityFilters,
    limit: number,
    offset: number,
  ): Promise<MovementActivity[]> => {
    const rows = await db
      .select({
        id: inventoryMovements.id,
        type: inventoryMovements.type,
        quantity: inventoryMovements.quantity,
        createdAt: inventoryMovements.createdAt,
        itemId: items.id,
        itemSku: items.sku,
        itemName: items.name,
        itemUnit: items.unit,
        fromStorageSpaceId: fromSpace.id,
        fromStorageSpaceName: fromSpace.name,
        fromStorageSpaceCode: fromSpace.code,
        fromWarehouseName: fromWarehouse.name,
        toStorageSpaceId: toSpace.id,
        toStorageSpaceName: toSpace.name,
        toStorageSpaceCode: toSpace.code,
        toWarehouseName: toWarehouse.name,
        performedById: users.id,
        performedByName: users.name,
        performedByEmail: users.email,
      })
      .from(inventoryMovements)
      /*
       * Items and the acting user always exist
       * (restrict FKs); spaces are optional per
       * movement type.
       */
      .innerJoin(
        items,
        eq(inventoryMovements.itemId, items.id),
      )
      .innerJoin(
        users,
        eq(inventoryMovements.createdBy, users.id),
      )
      .leftJoin(
        fromSpace,
        eq(
          inventoryMovements.fromStorageSpaceId,
          fromSpace.id,
        ),
      )
      .leftJoin(
        fromWarehouse,
        eq(fromSpace.warehouseId, fromWarehouse.id),
      )
      .leftJoin(
        toSpace,
        eq(
          inventoryMovements.toStorageSpaceId,
          toSpace.id,
        ),
      )
      .leftJoin(
        toWarehouse,
        eq(toSpace.warehouseId, toWarehouse.id),
      )
      .where(buildActivityFilters(filters))
      /*
       * Secondary ID ordering keeps pagination stable
       * when timestamps are identical.
       */
      .orderBy(
        desc(inventoryMovements.createdAt),
        desc(inventoryMovements.id),
      )
      .limit(limit)
      .offset(offset);

    return rows.map((row) => {
      const from = row.fromStorageSpaceId
        ? {
            id: row.fromStorageSpaceId,
            name: row.fromStorageSpaceName ?? "",
            code: row.fromStorageSpaceCode ?? "",
            warehouseName:
              row.fromWarehouseName ?? "",
          }
        : null;

      const to = row.toStorageSpaceId
        ? {
            id: row.toStorageSpaceId,
            name: row.toStorageSpaceName ?? "",
            code: row.toStorageSpaceCode ?? "",
            warehouseName:
              row.toWarehouseName ?? "",
          }
        : null;

      return {
        id: row.id,
        type: row.type,
        quantity: row.quantity,
        createdAt: row.createdAt,
        item: {
          id: row.itemId,
          sku: row.itemSku,
          name: row.itemName,
          unit: row.itemUnit,
        },
        from,
        to,
        performedBy: {
          id: row.performedById,
          name: row.performedByName,
          email: row.performedByEmail,
        },
      } satisfies MovementActivity;
    });
  };

  return {
    create,
    countActivity,
    findActivity,
  };
};
