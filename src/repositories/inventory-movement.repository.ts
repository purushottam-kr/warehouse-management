import "server-only";

import type { db } from "@/db";
import { inventoryMovements } from "@/db/schema";
import type { CreateInventoryMovementInput } from "@/types/inventory-movement";

type DbTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

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

  return {
    create,
  };
};