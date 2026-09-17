import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { items } from "@/db/schema";
import type {
  CreateItemInput,
  UpdateItemInput,
} from "@/types/item";

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
    update,
    remove,
  };
};