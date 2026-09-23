import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { bays } from "@/db/schema";
import type {
  CreateBayInput,
  UpdateBayInput,
} from "@/types/bay";

export const createBayRepository = () => {
  const create = async (data: CreateBayInput) => {
    const [bay] = await db
      .insert(bays)
      .values(data)
      .returning();

    return bay;
  };

  const findById = async (id: string) => {
    const [bay] = await db
      .select()
      .from(bays)
      .where(eq(bays.id, id))
      .limit(1);

    return bay ?? null;
  };

  const findByCode = async (
    aisleId: string,
    code: string,
  ) => {
    const [bay] = await db
      .select()
      .from(bays)
      .where(
        and(
          eq(bays.aisleId, aisleId),
          eq(bays.code, code),
        ),
      )
      .limit(1);

    return bay ?? null;
  };

  const findManyByAisleId = async (
    aisleId: string,
  ) => {
    return db
      .select()
      .from(bays)
      .where(eq(bays.aisleId, aisleId))
      .orderBy(asc(bays.name));
  };

  const update = async (
    id: string,
    data: UpdateBayInput,
  ) => {
    const [bay] = await db
      .update(bays)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(bays.id, id))
      .returning();

    return bay ?? null;
  };

  const remove = async (id: string) => {
    const [bay] = await db
      .delete(bays)
      .where(eq(bays.id, id))
      .returning();

    return bay ?? null;
  };

  return {
    create,
    findById,
    findByCode,
    findManyByAisleId,
    update,
    remove,
  };
};
