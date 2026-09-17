import "server-only";

import Decimal from "decimal.js";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { items } from "@/db/schema";
import {
  CapacityExceededError,
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { normalizeStorageType } from "@/lib/inventory/storage-type";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import { createInventoryMovementRepository } from "@/repositories/inventory-movement.repository";
import type {
  CreateTransferInput,
  TransferResult,
} from "@/types/transfer";

export const createTransferService = () => {
  const allocationRepository =
    createAllocationRepository();

  const movementRepository =
    createInventoryMovementRepository();

  const transferInventory = async (
    input: CreateTransferInput,
    createdBy: string,
  ): Promise<TransferResult> => {
    if (
      input.fromStorageSpaceId ===
      input.toStorageSpaceId
    ) {
      throw new ConflictError(
        "TRANSFER_SOURCE_DESTINATION_SAME",
        "Source and destination storage spaces must be different.",
      );
    }

    /*
     * These lookups are used to determine the warehouse rows
     * that must be locked before the transfer.
     *
     * They are not authoritative for the final validation.
     * The authoritative checks happen again after locking.
     */
    const [sourceSpace, destinationSpace] =
      await Promise.all([
        db.query.storageSpaces.findFirst({
          where: (storageSpace, { eq }) =>
            eq(
              storageSpace.id,
              input.fromStorageSpaceId,
            ),
        }),
        db.query.storageSpaces.findFirst({
          where: (storageSpace, { eq }) =>
            eq(
              storageSpace.id,
              input.toStorageSpaceId,
            ),
        }),
      ]);

    if (!sourceSpace) {
      throw new NotFoundError(
        "Source storage space not found.",
      );
    }

    if (!destinationSpace) {
      throw new NotFoundError(
        "Destination storage space not found.",
      );
    }

    const storageSpaceIds = [
      input.fromStorageSpaceId,
      input.toStorageSpaceId,
    ].sort();

    const warehouseIds = [
      sourceSpace.warehouseId,
      destinationSpace.warehouseId,
    ]
      .filter(
        (warehouseId, index, ids) =>
          ids.indexOf(warehouseId) === index,
      )
      .sort();

    return db.transaction(async (transaction) => {
      /*
       * Lock warehouses first, then storage spaces.
       *
       * This follows the same lock ordering used by allocation
       * and keeps concurrent inventory operations consistent.
       */
      const lockedWarehouses =
        await allocationRepository.lockWarehouses(
          warehouseIds,
          transaction,
        );

      const warehouseById = new Map(
        lockedWarehouses.map((warehouse) => [
          warehouse.id,
          warehouse,
        ]),
      );

      const lockedStorageSpaces =
        await allocationRepository.lockStorageSpaces(
          storageSpaceIds,
          transaction,
        );

      const sourceLockedSpace =
        lockedStorageSpaces.find(
          (space) =>
            space.id === input.fromStorageSpaceId,
        );

      const destinationLockedSpace =
        lockedStorageSpaces.find(
          (space) =>
            space.id === input.toStorageSpaceId,
        );

      if (!sourceLockedSpace) {
        throw new NotFoundError(
          "Source storage space not found.",
        );
      }

      if (!destinationLockedSpace) {
        throw new NotFoundError(
          "Destination storage space not found.",
        );
      }

      /*
       * Re-check warehouse state after acquiring the locks.
       */
      const sourceWarehouse =
        warehouseById.get(
          sourceLockedSpace.warehouseId,
        );

      const destinationWarehouse =
        warehouseById.get(
          destinationLockedSpace.warehouseId,
        );

      if (!sourceWarehouse) {
        throw new NotFoundError(
          "Source warehouse not found.",
        );
      }

      if (!destinationWarehouse) {
        throw new NotFoundError(
          "Destination warehouse not found.",
        );
      }

      if (
        sourceWarehouse.status !== "ACTIVE" ||
        sourceWarehouse.deletedAt !== null
      ) {
        throw new ConflictError(
          "SOURCE_WAREHOUSE_INACTIVE",
          "Source warehouse is inactive.",
        );
      }

      if (
        destinationWarehouse.status !== "ACTIVE" ||
        destinationWarehouse.deletedAt !== null
      ) {
        throw new ConflictError(
          "DESTINATION_WAREHOUSE_INACTIVE",
          "Destination warehouse is inactive.",
        );
      }

      /*
       * Re-check storage-space state after locking.
       */
      if (sourceLockedSpace.status !== "ACTIVE") {
        throw new ConflictError(
          "SOURCE_STORAGE_SPACE_INACTIVE",
          "Source storage space is inactive.",
        );
      }

      if (
        destinationLockedSpace.status !== "ACTIVE"
      ) {
        throw new ConflictError(
          "DESTINATION_STORAGE_SPACE_INACTIVE",
          "Destination storage space is inactive.",
        );
      }

      /*
       * Read the item inside the transaction so the transfer
       * uses the current item definition.
       */
      const [item] = await transaction
        .select({
          id: items.id,
          requiredStorageType:
            items.requiredStorageType,
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
       * The source allocation is re-read after the storage
       * spaces have been locked. This is authoritative.
       */
      const sourceAllocation =
        await allocationRepository.findByItemAndStorageSpace(
          input.itemId,
          input.fromStorageSpaceId,
          transaction,
        );

      if (!sourceAllocation) {
        throw new ConflictError(
          "SOURCE_ALLOCATION_NOT_FOUND",
          "The item is not allocated to the source storage space.",
        );
      }

      const sourceQuantity = new Decimal(
        sourceAllocation.quantity,
      );

      const transferQuantity = new Decimal(
        input.quantity,
      );

      if (
        sourceQuantity.lessThan(
          transferQuantity,
        )
      ) {
        throw new ConflictError(
          "INSUFFICIENT_SOURCE_INVENTORY",
          "Source storage space does not contain enough inventory.",
        );
      }

      /*
       * Check destination storage compatibility.
       *
       * requiredStorageType is the item's business
       * requirement. If it is null, the item has no specific
       * storage-type restriction.
       */
      const requiredStorageType =
        item.requiredStorageType === null
          ? null
          : normalizeStorageType(
              item.requiredStorageType,
            );

      const destinationStorageType =
        normalizeStorageType(
          destinationLockedSpace.storageType,
        );

      if (
        requiredStorageType !== null &&
        destinationStorageType !==
          requiredStorageType
      ) {
        throw new ConflictError(
          "STORAGE_TYPE_MISMATCH",
          "Destination storage space is not compatible with the item's required storage type.",
        );
      }

      /*
       * Get the current destination usage while both spaces
       * are locked.
       */
      const allocatedQuantities =
        await allocationRepository.getAllocatedQuantitiesForStorageSpaces(
          [input.toStorageSpaceId],
          transaction,
        );

      const destinationAllocatedQuantity =
        allocatedQuantities.get(
          input.toStorageSpaceId,
        ) ?? "0";

      const destinationAvailableCapacity =
        new Decimal(
          destinationLockedSpace.capacity,
        ).minus(
          destinationAllocatedQuantity,
        );

      if (
        destinationAvailableCapacity.lessThan(
          transferQuantity,
        )
      ) {
        throw new CapacityExceededError(
          "DESTINATION_CAPACITY_EXCEEDED",
          "Destination storage space does not have enough available capacity.",
        );
      }

      /*
       * Update or remove the source allocation.
       *
       * A zero-quantity allocation must never remain because
       * the database requires quantity > 0.
       */
      if (
        sourceQuantity.equals(transferQuantity)
      ) {
        await allocationRepository.remove(
          sourceAllocation.id,
          transaction,
        );
      } else {
        const remainingSourceQuantity =
          sourceQuantity.minus(
            transferQuantity,
          );

        await allocationRepository.updateQuantity(
          sourceAllocation.id,
          remainingSourceQuantity.toFixed(3),
          transaction,
        );
      }

      /*
       * The destination may already contain the same item.
       * Because allocations have a unique
       * (item_id, storage_space_id) constraint, update it
       * instead of creating a duplicate row.
       */
      const destinationAllocation =
        await allocationRepository.findByItemAndStorageSpace(
          input.itemId,
          input.toStorageSpaceId,
          transaction,
        );

      if (destinationAllocation) {
        const newDestinationQuantity =
          new Decimal(
            destinationAllocation.quantity,
          ).plus(transferQuantity);

        await allocationRepository.updateQuantity(
          destinationAllocation.id,
          newDestinationQuantity.toFixed(3),
          transaction,
        );
      } else {
        await allocationRepository.create(
          input.itemId,
          input.toStorageSpaceId,
          transferQuantity.toFixed(3),
          transaction,
        );
      }

      /*
       * Inventory history is part of the same transaction.
       * If anything above fails, this movement is rolled back
       * together with the allocation changes.
       */
      await movementRepository.create(
        {
          itemId: input.itemId,
          type: "MOVE",
          quantity: transferQuantity.toFixed(3),
          fromStorageSpaceId:
            input.fromStorageSpaceId,
          toStorageSpaceId:
            input.toStorageSpaceId,
          createdBy,
        },
        transaction,
      );

      return {
        itemId: input.itemId,
        fromStorageSpaceId:
          input.fromStorageSpaceId,
        toStorageSpaceId:
          input.toStorageSpaceId,
        quantity: transferQuantity.toFixed(3),
      };
    });
  };

  return {
    transferInventory,
  };
};