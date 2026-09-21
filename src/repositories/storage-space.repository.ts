import {
  and,
  asc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import { storageSpaces, warehouses } from "@/db/schema";
import type {
  CreateStorageSpaceInput,
  StorageSpaceListRow,
  StorageSpaceStatus,
  UpdateStorageSpaceInput,
} from "@/types/storage-space";

type StorageSpaceFilters = {
  search?: string;
  warehouseId?: string;
  storageType?: string;
  status?: StorageSpaceStatus;
};

const buildStorageSpaceFilters = (
  filters: StorageSpaceFilters,
): SQL | undefined => {
  const conditions: SQL[] = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(storageSpaces.code, `%${filters.search}%`),
        ilike(storageSpaces.name, `%${filters.search}%`),
      ) as SQL,
    );
  }

  if (filters.warehouseId) {
    conditions.push(
      eq(storageSpaces.warehouseId, filters.warehouseId),
    );
  }

  if (filters.storageType) {
    conditions.push(
      ilike(
        storageSpaces.storageType,
        `%${filters.storageType}%`,
      ),
    );
  }

  if (filters.status) {
    conditions.push(
      eq(storageSpaces.status, filters.status),
    );
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return and(...conditions);
};

export const createStorageSpaceRepository = () => {
  const create = async (data: CreateStorageSpaceInput) => {
    const [storageSpace] = await db
      .insert(storageSpaces)
      .values({
        warehouseId: data.warehouseId,
        name: data.name,
        code: data.code,
        capacity: data.capacity,
        storageType: data.storageType,
      })
      .returning();

    return storageSpace;
  };

  const findById = async (id: string) => {
    const [storageSpace] = await db
      .select()
      .from(storageSpaces)
      .where(eq(storageSpaces.id, id))
      .limit(1);

    return storageSpace ?? null;
  };

  const findByCode = async (
    warehouseId: string,
    code: string,
  ) => {
    const [storageSpace] = await db
      .select()
      .from(storageSpaces)
      .where(
        and(
          eq(storageSpaces.warehouseId, warehouseId),
          eq(storageSpaces.code, code),
        ),
      )
      .limit(1);

    return storageSpace ?? null;
  };

  const findManyByWarehouseId = async (
    warehouseId: string,
  ) => {
    return db
      .select()
      .from(storageSpaces)
      .where(eq(storageSpaces.warehouseId, warehouseId))
      .orderBy(asc(storageSpaces.name));
  };

  const findMany = async () => {
  return db
    .select({
      id: storageSpaces.id,
      warehouseId: storageSpaces.warehouseId,
      warehouseName: warehouses.name,
      name: storageSpaces.name,
      code: storageSpaces.code,
      capacity: storageSpaces.capacity,
      storageType: storageSpaces.storageType,
      status: storageSpaces.status,
      createdAt: storageSpaces.createdAt,
      updatedAt: storageSpaces.updatedAt,
    })
    .from(storageSpaces)
    .innerJoin(
      warehouses,
      eq(storageSpaces.warehouseId, warehouses.id),
    )
    .orderBy(asc(storageSpaces.name));
};

  /*
   * Total matching storage spaces for pagination.
   *
   * No joins are needed: every filter references the
   * storage_spaces table only.
   */
  const countStorageSpaces = async (
    filters: StorageSpaceFilters,
  ): Promise<number> => {
    const [result] = await db
      .select({
        total: sql<string>`count(*)`,
      })
      .from(storageSpaces)
      .where(buildStorageSpaceFilters(filters));

    return Number(result.total);
  };

  const findStorageSpaces = async (
    filters: StorageSpaceFilters,
    limit: number,
    offset: number,
  ): Promise<StorageSpaceListRow[]> => {
    return db
      .select({
        id: storageSpaces.id,
        warehouseId: storageSpaces.warehouseId,
        warehouseName: warehouses.name,
        name: storageSpaces.name,
        code: storageSpaces.code,
        capacity: storageSpaces.capacity,
        storageType: storageSpaces.storageType,
        status: storageSpaces.status,
        createdAt: storageSpaces.createdAt,
        updatedAt: storageSpaces.updatedAt,
      })
      .from(storageSpaces)
      .innerJoin(
        warehouses,
        eq(storageSpaces.warehouseId, warehouses.id),
      )
      .where(buildStorageSpaceFilters(filters))
      /*
       * Secondary ID ordering keeps pagination stable
       * when timestamps are identical.
       */
      .orderBy(
        asc(storageSpaces.name),
        asc(storageSpaces.id),
      )
      .limit(limit)
      .offset(offset);
  };

  const update = async (
    id: string,
    data: UpdateStorageSpaceInput,
  ) => {
    const [storageSpace] = await db
      .update(storageSpaces)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(storageSpaces.id, id))
      .returning();

    return storageSpace ?? null;
  };

  const remove = async (id: string) => {
    const [storageSpace] = await db
      .delete(storageSpaces)
      .where(eq(storageSpaces.id, id))
      .returning();

    return storageSpace ?? null;
  };

  return {
    create,
    findById,
    findByCode,
    findManyByWarehouseId,
    findMany,
    countStorageSpaces,
    findStorageSpaces,
    update,
    remove,
  };
};