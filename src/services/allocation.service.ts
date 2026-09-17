import "server-only";

import Decimal from "decimal.js";

import { db } from "@/db";
import {
  CapacityExceededError,
  NotFoundError,
} from "@/lib/errors/errors";
import { normalizeStorageType } from "@/lib/inventory/storage-type";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import { createInventoryMovementRepository } from "@/repositories/inventory-movement.repository";
import { createItemRepository } from "@/repositories/item.repository";
import type {
  AllocationResult,
  CreateAllocationInput,
} from "@/types/allocation";

const itemRepository =
  createItemRepository();

const allocationRepository =
  createAllocationRepository();

const movementRepository =
  createInventoryMovementRepository();

export const allocateInventory = async (
  input: CreateAllocationInput,
  createdBy: string,
): Promise<AllocationResult> => {
  const item =
    await itemRepository.findById(
      input.itemId,
    );

  if (!item) {
    throw new NotFoundError("Item not found.");
  }

  const requiredStorageType =
    item.requiredStorageType
      ? normalizeStorageType(
          item.requiredStorageType,
        )
      : null;

  /*
   * Candidate discovery.
   *
   * This is only used to determine which rows we need to
   * lock. It is NOT the authoritative capacity calculation.
   */
  const candidates =
    await allocationRepository.findEligibleStorageSpaces(
      requiredStorageType,
    );

  if (candidates.length === 0) {
    throw new CapacityExceededError(
      "NO_ELIGIBLE_STORAGE_SPACE",
      "No eligible storage space is available for this item.",
    );
  }

  const requestedQuantity =
    new Decimal(input.quantity);

  const candidateSpaceIds =
    candidates.map(
      (candidate) =>
        candidate.storageSpaceId,
    );

  const candidateWarehouseIds = [
    ...new Set(
      candidates.map(
        (candidate) =>
          candidate.warehouseId,
      ),
    ),
  ].sort();

  return db.transaction(
    async (transaction) => {
      /*
       * Lock warehouses first.
       */
      const lockedWarehouses =
        await allocationRepository.lockWarehouses(
          candidateWarehouseIds,
          transaction,
        );

      const warehouseById = new Map(
        lockedWarehouses.map(
          (warehouse) => [
            warehouse.id,
            warehouse,
          ],
        ),
      );

      /*
       * Lock storage spaces second.
       */
      const lockedSpaces =
        await allocationRepository.lockStorageSpaces(
          candidateSpaceIds,
          transaction,
        );

      if (lockedSpaces.length === 0) {
        throw new CapacityExceededError(
          "NO_ELIGIBLE_STORAGE_SPACE",
          "No eligible storage space is available for this item.",
        );
      }

      /*
       * Re-read allocation totals AFTER acquiring locks.
       *
       * This is the authoritative capacity calculation.
       */
      const allocatedQuantities =
        await allocationRepository
          .getAllocatedQuantitiesForStorageSpaces(
            lockedSpaces.map(
              (space) => space.id,
            ),
            transaction,
          );

      let remaining =
        requestedQuantity;

      const allocationsToCreate: Array<{
        storageSpaceId: string;
        quantity: string;
      }> = [];

      /*
       * Candidate order is deterministic because the repository
       * returns spaces ordered by warehouse ID + space ID.
       */
      for (const space of lockedSpaces) {
        if (remaining.lessThanOrEqualTo(0)) {
          break;
        }

        const warehouse =
          warehouseById.get(
            space.warehouseId,
          );

        if (
          !warehouse ||
          warehouse.status !== "ACTIVE" ||
          warehouse.deletedAt !== null
        ) {
          continue;
        }

        if (space.status !== "ACTIVE") {
          continue;
        }

        if (
          requiredStorageType !== null &&
          normalizeStorageType(
            space.storageType,
          ) !== requiredStorageType
        ) {
          continue;
        }

        const allocated =
          allocatedQuantities.get(
            space.id,
          ) ?? "0.000";

        const available =
          new Decimal(
            space.capacity,
          ).minus(allocated);

        if (
          available.lessThanOrEqualTo(0)
        ) {
          continue;
        }

        const quantity =
          Decimal.min(
            remaining,
            available,
          );

        if (
          quantity.lessThanOrEqualTo(0)
        ) {
          continue;
        }

        allocationsToCreate.push({
          storageSpaceId: space.id,
          quantity: quantity.toFixed(3),
        });

        remaining =
          remaining.minus(quantity);
      }

      /*
       * If anything remains, the entire transaction rolls back.
       *
       * We deliberately do NOT partially allocate here.
       */
      if (remaining.greaterThan(0)) {
        throw new CapacityExceededError(
          "CAPACITY_EXCEEDED",
          `Insufficient storage capacity. ${remaining.toFixed(
            3,
          )} units could not be allocated.`,
        );
      }

      /*
       * Write allocations and movement records in the SAME
       * transaction.
       */
      for (const allocation of allocationsToCreate) {
        const existingAllocation =
          await allocationRepository.findByItemAndStorageSpace(
            input.itemId,
            allocation.storageSpaceId,
            transaction,
          );

        if (existingAllocation) {
          const newQuantity =
            new Decimal(
              existingAllocation.quantity,
            ).plus(
              allocation.quantity,
            );

          await allocationRepository.updateQuantity(
            existingAllocation.id,
            newQuantity.toFixed(3),
            transaction,
          );
        } else {
          await allocationRepository.create(
            input.itemId,
            allocation.storageSpaceId,
            allocation.quantity,
            transaction,
          );
        }

        await movementRepository.create(
          {
            itemId: input.itemId,
            type: "ALLOCATE",
            quantity: allocation.quantity,
            fromStorageSpaceId: null,
            toStorageSpaceId:
              allocation.storageSpaceId,
            createdBy,
          },
          transaction,
        );
      }

      return {
        itemId: input.itemId,
        requestedQuantity:
          input.quantity,
        allocations:
          allocationsToCreate,
      };
    },
  );
};