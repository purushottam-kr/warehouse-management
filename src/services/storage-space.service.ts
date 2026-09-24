import "server-only";

import Decimal from "decimal.js";

import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { isPostgresUniqueViolation } from "@/lib/errors/database";
import { requireRole } from "@/lib/auth/authorization";
import { createStorageSpaceRepository } from "@/repositories/storage-space.repository";
import { createWarehouseRepository } from "@/repositories/warehouse.repository";
import { createAisleRepository } from "@/repositories/aisle.repository";
import { createBayRepository } from "@/repositories/bay.repository";
import { createLayerRepository } from "@/repositories/layer.repository";
import type {
  CreateStorageSpaceInput,
  ListStorageSpacesQuery,
  StorageSpaceListPage,
  UpdateStorageSpaceInput,
} from "@/types/storage-space";
import { normalizeStorageType } from "@/lib/inventory/storage-type";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import { resolvePagination } from "@/lib/api/pagination";
import { assertCanDeactivate } from "@/services/helpers/common";


const allocationRepository =
  createAllocationRepository();

const storageSpaceRepository =
  createStorageSpaceRepository();

const warehouseRepository =
  createWarehouseRepository();

const aisleRepository = createAisleRepository();

const bayRepository = createBayRepository();

const layerRepository = createLayerRepository();

const STORAGE_SPACE_CODE_UNIQUE_CONSTRAINT =
  "storage_spaces_warehouse_code_unique";

export const createStorageSpace = async (
  input: CreateStorageSpaceInput,
) => {
  /*
   * Step 5 contract: the layer is the canonical parent.
   * Walk up layer -> bay -> aisle -> warehouse to
   * resolve (and verify) the owning warehouse, then
   * dual-write both columns so existing warehouse_id
   * readers keep working until finalize drops it.
   */
  const layer = await layerRepository.findById(
    input.layerId,
  );

  if (!layer) {
    throw new NotFoundError("Layer not found.");
  }

  const bay = await bayRepository.findById(layer.bayId);

  if (!bay) {
    throw new NotFoundError("Bay not found.");
  }

  const aisle = await aisleRepository.findById(
    bay.aisleId,
  );

  if (!aisle) {
    throw new NotFoundError("Aisle not found.");
  }

  const warehouse = await warehouseRepository.findById(
    aisle.warehouseId,
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

  if (
    input.warehouseId !== undefined &&
    input.warehouseId !== warehouse.id
  ) {
    throw new ConflictError(
      "STORAGE_SPACE_WAREHOUSE_MISMATCH",
      "The layer does not belong to the given warehouse.",
    );
  }

  const name = input.name.trim();
  const code = input.code.trim();
  const storageType = normalizeStorageType(
  input.storageType,
  );

  const existingSpace =
    await storageSpaceRepository.findByCode(
      warehouse.id,
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
      warehouseId: warehouse.id,
      layerId: input.layerId,
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

/*
 * Step 8: full location path for display surfaces —
 * Warehouse / Aisle / Bay / Layer / Space.
 */
export const getStorageSpaceLocationPath = async (
  id: string,
) => {
  const path =
    await storageSpaceRepository.getLocationPath(id);

  if (!path) {
    throw new NotFoundError("Storage space not found.");
  }

  return path;
};

export const listStorageSpaces = async () => {
  return storageSpaceRepository.findMany();
};

export const listStorageSpacesPage = async (
  query: ListStorageSpacesQuery,
): Promise<StorageSpaceListPage> => {
  const total =
    await storageSpaceRepository.countStorageSpaces(
      query,
    );

  const { page, totalPages, offset } = resolvePagination(
    total,
    query.page,
    query.pageSize,
  );

  const storageSpaces =
    await storageSpaceRepository.findStorageSpaces(
      query,
      query.pageSize,
      offset,
    );

  return {
    storageSpaces,
    pagination: {
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
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
   * Capacity must never drop below allocated inventory:
   *
   *   capacity = 50
   *   allocated inventory = 80  -> invalid
   */
  if (
    input.capacity !== undefined &&
    input.capacity !== existingSpace.capacity
  ) {
    const allocatedQuantity =
      await allocationRepository.getAllocatedQuantityForStorageSpace(
        existingSpace.id,
      );

    if (
      new Decimal(input.capacity).lessThan(
        new Decimal(allocatedQuantity),
      )
    ) {
      throw new ConflictError(
        "CAPACITY_BELOW_ALLOCATED",
        `Storage space capacity cannot be less than its allocated inventory (${allocatedQuantity}).`,
      );
    }
  }

  if (
    input.status === "INACTIVE" &&
    existingSpace.status !== "INACTIVE"
  ) {
    const allocatedQuantity =
      await allocationRepository.getAllocatedQuantityForStorageSpace(
        existingSpace.id,
      );

    assertCanDeactivate(
      input.status,
      allocatedQuantity,
      "STORAGE_SPACE_HAS_INVENTORY",
      "a storage space",
    );
  }

  const updateData: UpdateStorageSpaceInput = {
    ...(input.name !== undefined && {
      name: input.name.trim(),
    }),

    ...(input.code !== undefined && {
      code: input.code.trim(),
    }),

    ...(input.capacity !== undefined && {
      capacity: input.capacity,
    }),

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