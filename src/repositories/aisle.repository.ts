import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { aisles } from "@/db/schema";
import type {
  CreateAisleInput,
  UpdateAisleInput,
} from "@/types/aisle";

export const createAisleRepository = () => {
  const create = async (data: CreateAisleInput) => {
    const [aisle] = await db
      .insert(aisles)
      .values(data)
      .returning();

    return aisle;
  };

  const findById = async (id: string) => {
    const [aisle] = await db
      .select()
      .from(aisles)
      .where(eq(aisles.id, id))
      .limit(1);

    return aisle ?? null;
  };

  const findByCode = async (
    warehouseId: string,
    code: string,
  ) => {
    const [aisle] = await db
      .select()
      .from(aisles)
      .where(
        and(
          eq(aisles.warehouseId, warehouseId),
          eq(aisles.code, code),
        ),
      )
      .limit(1);

    return aisle ?? null;
  };

  const findManyByWarehouseId = async (
    warehouseId: string,
  ) => {
    return db
      .select()
      .from(aisles)
      .where(eq(aisles.warehouseId, warehouseId))
      .orderBy(asc(aisles.name));
  };

  const update = async (
    id: string,
    data: UpdateAisleInput,
  ) => {
    const [aisle] = await db
      .update(aisles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(aisles.id, id))
      .returning();

    return aisle ?? null;
  };

  const remove = async (id: string) => {
    const [aisle] = await db
      .delete(aisles)
      .where(eq(aisles.id, id))
      .returning();

    return aisle ?? null;
  };

  return {
    create,
    findById,
    findByCode,
    findManyByWarehouseId,
    update,
    remove,
  };
};
