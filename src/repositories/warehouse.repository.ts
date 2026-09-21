import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { warehouses } from "@/db/schema";

import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  WarehouseListRow,
  WarehouseStatus,
} from "@/types/warehouse";

type WarehouseFilters = {
  search?: string;
  status?: WarehouseStatus;
};

const buildWarehouseFilters = (
  filters: WarehouseFilters,
): SQL | undefined => {
  const conditions: SQL[] = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(warehouses.code, `%${filters.search}%`),
        ilike(warehouses.name, `%${filters.search}%`),
      ) as SQL,
    );
  }

  if (filters.status) {
    conditions.push(
      eq(warehouses.status, filters.status),
    );
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return and(...conditions);
};

/*
 * Capacity read model.
 *
 * Correlated subqueries keep the main list query a flat
 * select (no GROUP BY) while attaching:
 *
 * - total capacity: sum of the warehouse's storage-space
 *   capacities
 * - allocated quantity: sum of allocation quantities
 *   across those spaces
 *
 * The SQL is written raw with explicit aliases because
 * drizzle renders interpolated column references
 * unqualified inside sql templates, which is ambiguous
 * in correlated subqueries.
 */
const totalCapacitySql = sql<string>`
  (
    SELECT COALESCE(SUM(sp.capacity), 0)
    FROM storage_spaces sp
    WHERE sp.warehouse_id = warehouses.id
  )
`;

const allocatedQuantitySql = sql<string>`
  (
    SELECT COALESCE(SUM(al.quantity), 0)
    FROM allocations al
    INNER JOIN storage_spaces sp
      ON sp.id = al.storage_space_id
    WHERE sp.warehouse_id = warehouses.id
  )
`;

export const createWarehouseRepository = () => {
  const create = async (
    data: CreateWarehouseInput,
  ) => {
    const [warehouse] = await db
      .insert(warehouses)
      .values(data)
      .returning();

    return warehouse;
  };

  const findById = async (id: string) => {
    const [warehouse] = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, id))
      .limit(1);

    return warehouse ?? null;
  };

  const findByCode = async (code: string) => {
    const [warehouse] = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.code, code))
      .limit(1);

    return warehouse ?? null;
  };

  const findMany = async () => {
    return db
      .select()
      .from(warehouses)
      .orderBy(desc(warehouses.createdAt));
  };

  /*
   * Total matching warehouses for pagination.
   *
   * No joins are needed: every filter references the
   * warehouses table only.
   */
  const countWarehouses = async (
    filters: WarehouseFilters,
  ): Promise<number> => {
    const [result] = await db
      .select({
        total: sql<string>`count(*)`,
      })
      .from(warehouses)
      .where(buildWarehouseFilters(filters));

    return Number(result.total);
  };

  const findWarehouses = async (
    filters: WarehouseFilters,
    limit: number,
    offset: number,
  ): Promise<WarehouseListRow[]> => {
    return db
      .select({
        id: warehouses.id,
        name: warehouses.name,
        code: warehouses.code,
        address: warehouses.address,
        status: warehouses.status,
        createdAt: warehouses.createdAt,
        updatedAt: warehouses.updatedAt,
        deletedAt: warehouses.deletedAt,
        totalCapacity: totalCapacitySql,
        allocatedQuantity: allocatedQuantitySql,
      })
      .from(warehouses)
      .where(buildWarehouseFilters(filters))
      /*
       * Secondary ID ordering keeps pagination stable
       * when timestamps are identical.
       */
      .orderBy(
        desc(warehouses.createdAt),
        desc(warehouses.id),
      )
      .limit(limit)
      .offset(offset);
  };

  const update = async (
    id: string,
    data: UpdateWarehouseInput,
  ) => {
    const [warehouse] = await db
      .update(warehouses)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(warehouses.id, id))
      .returning();

    return warehouse ?? null;
  };

  const remove = async (id: string) => {
    const [warehouse] = await db
      .delete(warehouses)
      .where(eq(warehouses.id, id))
      .returning();

    return warehouse ?? null;
  };

  return {
    create,
    findById,
    findByCode,
    findMany,
    countWarehouses,
    findWarehouses,
    update,
    remove,
  };
};