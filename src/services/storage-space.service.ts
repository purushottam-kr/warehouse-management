import "server-only";

import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { isPostgresUniqueViolation } from "@/lib/errors/database";
import { requireRole } from "@/lib/auth/authorization";
import { createStorageSpaceRepository } from "@/repositories/storage-space.repository";
import { createWarehouseRepository } from "@/repositories/warehouse.repository";
import type {
  CreateStorageSpaceInput,
  UpdateStorageSpaceInput,
} from "@/types/storage-space";
import { normalizeStorageType } from "@/lib/inventory/storage-type";
import { createAllocationRepository } from "@/repositories/allocation.repository";


const allocationRepository =
  createAllocationRepository();

const storageSpaceRepository =
  createStorageSpaceRepository();

const warehouseRepository =
  createWarehouseRepository();

const STORAGE_SPACE_CODE_UNIQUE_CONSTRAINT =
  "storage_spaces_warehouse_code_unique";

export const createStorageSpace = async (
  input: CreateStorageSpaceInput,
) => {
  const warehouse = await warehouseRepository.findById(
    input.warehouseId,
  );

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found.");
  }

  if (warehouse.deletedAt !== null) {
    throw new ConflictError(
      "WAREHOUSE_DELETED",
      "Cannot create a storage space in a deleted warehouse.",
    );
  }

  const name = input.name.trim();
  const code = input.code.trim();
  const storageType = normalizeStorageType(
  input.storageType,
  );

  const existingSpace =
    await storageSpaceRepository.findByCode(
      input.warehouseId,
      code,
    );

  if (existingSpace) {
    throw new ConflictError(
      "STORAGE_SPACE_CODE_ALREADY_EXISTS",
      "A storage space with this code already exists in this warehouse.",
    );
  }

  try {
    return await storageSpaceRepository.create({
      warehouseId: input.warehouseId,
      name,
      code,
      capacity: input.capacity,
      storageType,
    });
  } catch (error) {
    // The pre-check above improves the error response,
    // but PostgreSQL's UNIQUE constraint is the actual
    // concurrency protection.
    if (
      isPostgresUniqueViolation(
        error,
        STORAGE_SPACE_CODE_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "STORAGE_SPACE_CODE_ALREADY_EXISTS",
        "A storage space with this code already exists in this warehouse.",
      );
    }

    throw error;
  }
};

export const getStorageSpaceById = async (
  id: string,
) => {
  const storageSpace =
    await storageSpaceRepository.findById(id);

  if (!storageSpace) {
    throw new NotFoundError("Storage space not found.");
  }

  return storageSpace;
};

export const listStorageSpacesByWarehouse = async (
  warehouseId: string,
) => {
  const warehouse =
    await warehouseRepository.findById(warehouseId);

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found.");
  }

  return storageSpaceRepository.findManyByWarehouseId(
    warehouseId,
  );
};

export const listStorageSpaces = async () => {
  return storageSpaceRepository.findMany();
};

export const updateStorageSpace = async (
  id: string,
  input: UpdateStorageSpaceInput,
) => {
  const existingSpace =
    await getStorageSpaceById(id);

  const warehouse =
    await warehouseRepository.findById(
      existingSpace.warehouseId,
    );

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found.");
  }

  if (warehouse.deletedAt !== null) {
    throw new ConflictError(
      "WAREHOUSE_DELETED",
      "Cannot update a storage space in a deleted warehouse.",
    );
  }

  if (input.code !== undefined) {
    const code = input.code.trim();

    if (code !== existingSpace.code) {
      const existingWithCode =
        await storageSpaceRepository.findByCode(
          existingSpace.warehouseId,
          code,
        );

      if (existingWithCode) {
        throw new ConflictError(
          "STORAGE_SPACE_CODE_ALREADY_EXISTS",
          "A storage space with this code already exists in this warehouse.",
        );
      }
    }
  }

  /*
   * Capacity update is intentionally deferred.
   *
   * Once the allocation repository exists, we must verify:
   *
   *   new capacity >= SUM(allocations.quantity)
   *
   * Otherwise this invalid state could occur:
   *
   *   capacity = 50
   *   allocated inventory = 80
   *
   * This check belongs here in the service layer, but it
   * depends on the allocation repository that will be
   * implemented during the allocation feature.
   */
  if (
  input.capacity !== undefined &&
  input.capacity !== existingSpace.capacity
) {
  const allocatedQuantity =
    await allocationRepository.getAllocatedQuantityForStorageSpace(
      existingSpace.id,
    );

  if (Number(input.capacity) < Number(allocatedQuantity)) {
    throw new ConflictError(
      "CAPACITY_BELOW_ALLOCATED",
      `Storage space capacity cannot be less than its allocated inventory (${allocatedQuantity}).`,
    );
  }
}

  const updateData: UpdateStorageSpaceInput = {
    ...(input.name !== undefined && {
      name: input.name.trim(),
    }),

    ...(input.code !== undefined && {
      code: input.code.trim(),
    }),

    // Capacity is intentionally excluded from actual updates
    // until allocation checks are implemented.

    ...(input.storageType !== undefined && {
      storageType: normalizeStorageType(
        input.storageType,
      ),
    }),

    ...(input.status !== undefined && {
      status: input.status,
    }),
  };

  try {
    const updatedSpace =
      await storageSpaceRepository.update(
        id,
        updateData,
      );

    if (!updatedSpace) {
      throw new NotFoundError("Storage space not found.");
    }

    return updatedSpace;
  } catch (error) {
    // The database constraint handles concurrent requests
    // attempting to use the same code in the same warehouse.
    if (
      isPostgresUniqueViolation(
        error,
        STORAGE_SPACE_CODE_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "STORAGE_SPACE_CODE_ALREADY_EXISTS",
        "A storage space with this code already exists in this warehouse.",
      );
    }

    throw error;
  }
};

export const deleteStorageSpace = async (
  id: string,
) => {
  await requireRole("ADMIN");

  const storageSpace =
    await getStorageSpaceById(id);

  const allocatedQuantity =
    await allocationRepository.getAllocatedQuantityForStorageSpace(
      storageSpace.id,
    );

  if (Number(allocatedQuantity) > 0) {
    throw new ConflictError(
      "STORAGE_SPACE_HAS_INVENTORY",
      "Cannot delete a storage space that contains inventory.",
    );
  }

  const deletedStorageSpace =
    await storageSpaceRepository.remove(id);

  if (!deletedStorageSpace) {
    throw new NotFoundError("Storage space not found.");
  }

  return deletedStorageSpace;
};