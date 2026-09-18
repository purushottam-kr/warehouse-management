import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { storageSpaces, warehouses } from "@/db/schema";
import type {
  CreateStorageSpaceInput,
  UpdateStorageSpaceInput,
} from "@/types/storage-space";

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
    update,
    remove,
  };
};