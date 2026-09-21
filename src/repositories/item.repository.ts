import "server-only";

import {
  and,
  desc,
  eq,
  exists,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  allocations,
  items,
  storageSpaces,
} from "@/db/schema";
import type {
  CreateItemInput,
  ItemListPage,
  UpdateItemInput,
} from "@/types/item";

type ItemFilters = {
  search?: string;
  warehouseId?: string;
  storageSpaceId?: string;
};

const buildItemFilters = (
  filters: ItemFilters,
): SQL | undefined => {
  const conditions: SQL[] = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(items.sku, `%${filters.search}%`),
        ilike(items.name, `%${filters.search}%`),
      ) as SQL,
    );
  }

  /*
   * Warehouse and storage-space membership are
   * expressed as EXISTS over allocations so an item
   * held in several spaces of the same warehouse still
   * appears exactly once.
   */
  if (filters.warehouseId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(allocations)
          .innerJoin(
            storageSpaces,
            eq(
              allocations.storageSpaceId,
              storageSpaces.id,
            ),
          )
          .where(
            and(
              eq(allocations.itemId, items.id),
              eq(
                storageSpaces.warehouseId,
                filters.warehouseId,
              ),
            ),
          ),
      ),
    );
  }

  if (filters.storageSpaceId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(allocations)
          .where(
            and(
              eq(allocations.itemId, items.id),
              eq(
                allocations.storageSpaceId,
                filters.storageSpaceId,
              ),
            ),
          ),
      ),
    );
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return and(...conditions);
};

export const createItemRepository = () => {
  const create = async (data: CreateItemInput) => {
    const [item] = await db
      .insert(items)
      .values({
        sku: data.sku,
        name: data.name,
        description: data.description ?? null,
        unit: data.unit,
        requiredStorageType:
          data.requiredStorageType ?? null,
      })
      .returning();

    return item;
  };

  const findById = async (id: string) => {
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, id))
      .limit(1);

    return item ?? null;
  };

  const findBySku = async (sku: string) => {
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.sku, sku))
      .limit(1);

    return item ?? null;
  };

  const findMany = async () => {
    return db
      .select()
      .from(items)
      .orderBy(desc(items.createdAt));
  };

  /*
   * Total matching items for pagination.
   *
   * No joins are needed: membership filters run as
   * correlated EXISTS subqueries inside WHERE.
   */
  const countItems = async (
    filters: ItemFilters,
  ): Promise<number> => {
    const [result] = await db
      .select({
        total: sql<string>`count(*)`,
      })
      .from(items)
      .where(buildItemFilters(filters));

    return Number(result.total);
  };

  const findItems = async (
    filters: ItemFilters,
    limit: number,
    offset: number,
  ): Promise<ItemListPage["items"]> => {
    return db
      .select()
      .from(items)
      .where(buildItemFilters(filters))
      /*
       * Secondary ID ordering keeps pagination stable
       * when timestamps are identical.
       */
      .orderBy(desc(items.createdAt), desc(items.id))
      .limit(limit)
      .offset(offset);
  };

  const update = async (
    id: string,
    data: UpdateItemInput,
  ) => {
    const [item] = await db
      .update(items)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(items.id, id))
      .returning();

    return item ?? null;
  };

  const remove = async (id: string) => {
    const [item] = await db
      .delete(items)
      .where(eq(items.id, id))
      .returning();

    return item ?? null;
  };

  return {
    create,
    findById,
    findBySku,
    findMany,
    countItems,
    findItems,
    update,
    remove,
  };
};