import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { layers } from "@/db/schema";
import type {
  CreateLayerInput,
  UpdateLayerInput,
} from "@/types/layer";

export const createLayerRepository = () => {
  const create = async (data: CreateLayerInput) => {
    const [layer] = await db
      .insert(layers)
      .values(data)
      .returning();

    return layer;
  };

  const findById = async (id: string) => {
    const [layer] = await db
      .select()
      .from(layers)
      .where(eq(layers.id, id))
      .limit(1);

    return layer ?? null;
  };

  const findByCode = async (
    bayId: string,
    code: string,
  ) => {
    const [layer] = await db
      .select()
      .from(layers)
      .where(
        and(
          eq(layers.bayId, bayId),
          eq(layers.code, code),
        ),
      )
      .limit(1);

    return layer ?? null;
  };

  const findManyByBayId = async (bayId: string) => {
    return db
      .select()
      .from(layers)
      .where(eq(layers.bayId, bayId))
      .orderBy(asc(layers.name));
  };

  const update = async (
    id: string,
    data: UpdateLayerInput,
  ) => {
    const [layer] = await db
      .update(layers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(layers.id, id))
      .returning();

    return layer ?? null;
  };

  const remove = async (id: string) => {
    const [layer] = await db
      .delete(layers)
      .where(eq(layers.id, id))
      .returning();

    return layer ?? null;
  };

  return {
    create,
    findById,
    findByCode,
    findManyByBayId,
    update,
    remove,
  };
};
