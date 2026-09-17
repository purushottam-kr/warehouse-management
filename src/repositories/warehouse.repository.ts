import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { warehouses } from "@/db/schema";

import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
} from "@/types/warehouse";

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
    update,
    remove,
  };
};