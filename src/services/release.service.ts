import "server-only";

import Decimal from "decimal.js";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { items } from "@/db/schema";
import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import { createInventoryMovementRepository } from "@/repositories/inventory-movement.repository";
import type {
  ReleaseInventoryInput,
  ReleaseResult,
} from "@/types/allocation";

export const createReleaseService = () => {
  const allocationRepository =
    createAllocationRepository();

  const movementRepository =
    createInventoryMovementRepository();

  const releaseInventory = async (
    input: ReleaseInventoryInput,
    createdBy: string,
  ): Promise<ReleaseResult> => {
    /*
     * Read the storage space first only to discover
     * its warehouse ID.
     *
     * This read is not authoritative. The actual storage
     * space and warehouse state are re-read under row locks
     * inside the transaction.
     */
    const storageSpace =
      await db.query.storageSpaces.findFirst({
        where: (storageSpace, { eq }) =>
          eq(
            storageSpace.id,
            input.storageSpaceId,
          ),
      });

    if (!storageSpace) {
      throw new NotFoundError(
        "Storage space not found.",
      );
    }

    return db.transaction(async (transaction) => {
      /*
       * Lock order must remain consistent with allocation
       * and transfer:
       *
       *   warehouse → storage space
       *
       * This prevents deadlocks between concurrent inventory
       * operations that touch the same resources.
       */
      const lockedWarehouses =
        await allocationRepository.lockWarehouses(
          [storageSpace.warehouseId],
          transaction,
        );

      const warehouse =
        lockedWarehouses[0];

      if (!warehouse) {
        throw new NotFoundError(
          "Warehouse not found.",
        );
      }

      const lockedStorageSpaces =
        await allocationRepository.lockStorageSpaces(
          [input.storageSpaceId],
          transaction,
        );

      const lockedStorageSpace =
        lockedStorageSpaces[0];

      if (!lockedStorageSpace) {
        throw new NotFoundError(
          "Storage space not found.",
        );
      }

      if (warehouse.deletedAt !== null) {
        throw new ConflictError(
          "WAREHOUSE_DELETED",
          "Cannot release inventory from a deleted warehouse.",
        );
      }

      /*
       * The item itself is read inside the transaction.
       * We only need to verify that it still exists.
       */
      const [item] = await transaction
        .select({
          id: items.id,
        })
        .from(items)
        .where(eq(items.id, input.itemId))
        .limit(1);

      if (!item) {
        throw new NotFoundError(
          "Item not found.",
        );
      }

      /*
       * Because the storage-space row is locked, allocation,
       * transfer, and release operations following the same
       * locking protocol cannot concurrently modify inventory
       * in this storage space.
       */
      const allocation =
        await allocationRepository.findByItemAndStorageSpace(
          input.itemId,
          input.storageSpaceId,
          transaction,
        );

      if (!allocation) {
        throw new ConflictError(
          "ALLOCATION_NOT_FOUND",
          "The item is not allocated to this storage space.",
        );
      }

      const allocatedQuantity =
        new Decimal(allocation.quantity);

      const releaseQuantity =
        new Decimal(input.quantity);

      if (
        releaseQuantity.greaterThan(
          allocatedQuantity,
        )
      ) {
        throw new ConflictError(
          "INSUFFICIENT_ALLOCATED_INVENTORY",
          "Cannot release more inventory than is allocated to this storage space.",
        );
      }

      /*
       * Full release:
       *
       * allocation = 50
       * release    = 50
       *
       * Remove the allocation row completely.
       */
      if (
        releaseQuantity.equals(
          allocatedQuantity,
        )
      ) {
        await allocationRepository.remove(
          allocation.id,
          transaction,
        );
      } else {
        /*
         * Partial release:
         *
         * allocation = 50
         * release    = 20
         * remaining  = 30
         */
        const remainingQuantity =
          allocatedQuantity.minus(
            releaseQuantity,
          );

        await allocationRepository.updateQuantity(
          allocation.id,
          remainingQuantity.toFixed(3),
          transaction,
        );
      }

      /*
       * Inventory movement is part of the same transaction.
       *
       * If anything fails after this point, the allocation
       * change and movement record are both rolled back.
       */
      await movementRepository.create(
        {
          itemId: input.itemId,
          type: "RELEASE",
          quantity: releaseQuantity.toFixed(3),
          fromStorageSpaceId:
            input.storageSpaceId,
          toStorageSpaceId: null,
          createdBy,
        },
        transaction,
      );

      return {
        itemId: input.itemId,
        storageSpaceId:
          input.storageSpaceId,
        releasedQuantity:
          releaseQuantity.toFixed(3),
      };
    });
  };

  return {
    releaseInventory,
  };
};