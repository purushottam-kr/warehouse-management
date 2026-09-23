import "server-only";

import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { isPostgresUniqueViolation } from "@/lib/errors/database";
import { requireRole } from "@/lib/auth/authorization";
import { createAisleRepository } from "@/repositories/aisle.repository";
import { createBayRepository } from "@/repositories/bay.repository";
import { createLayerRepository } from "@/repositories/layer.repository";
import { createStorageSpaceRepository } from "@/repositories/storage-space.repository";
import { createWarehouseRepository } from "@/repositories/warehouse.repository";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import type {
  CreateAisleInput,
  UpdateAisleInput,
} from "@/types/aisle";

const aisleRepository = createAisleRepository();
const bayRepository = createBayRepository();
const layerRepository = createLayerRepository();
const storageSpaceRepository =
  createStorageSpaceRepository();
const warehouseRepository =
  createWarehouseRepository();
const allocationRepository =
  createAllocationRepository();

const AISLE_CODE_UNIQUE_CONSTRAINT =
  "aisles_warehouse_code_unique";

export const createAisle = async (
  input: CreateAisleInput,
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
      "Cannot create an aisle in a deleted warehouse.",
    );
  }

  const name = input.name.trim();
  const code = input.code.trim();

  const existingAisle =
    await aisleRepository.findByCode(
      input.warehouseId,
      code,
    );

  if (existingAisle) {
    throw new ConflictError(
      "AISLE_CODE_ALREADY_EXISTS",
      "An aisle with this code already exists in this warehouse.",
    );
  }

  try {
    return await aisleRepository.create({
      warehouseId: input.warehouseId,
      name,
      code,
    });
  } catch (error) {
    // The pre-check above improves the error response,
    // but PostgreSQL's UNIQUE constraint is the actual
    // concurrency protection.
    if (
      isPostgresUniqueViolation(
        error,
        AISLE_CODE_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "AISLE_CODE_ALREADY_EXISTS",
        "An aisle with this code already exists in this warehouse.",
      );
    }

    throw error;
  }
};

export const getAisleById = async (id: string) => {
  const aisle = await aisleRepository.findById(id);

  if (!aisle) {
    throw new NotFoundError("Aisle not found.");
  }

  return aisle;
};

export const listAislesByWarehouse = async (
  warehouseId: string,
) => {
  const warehouse =
    await warehouseRepository.findById(warehouseId);

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found.");
  }

  return aisleRepository.findManyByWarehouseId(
    warehouseId,
  );
};

export const updateAisle = async (
  id: string,
  input: UpdateAisleInput,
) => {
  const existingAisle = await getAisleById(id);

  if (input.code !== undefined) {
    const code = input.code.trim();

    if (code !== existingAisle.code) {
      const existingWithCode =
        await aisleRepository.findByCode(
          existingAisle.warehouseId,
          code,
        );

      if (existingWithCode) {
        throw new ConflictError(
          "AISLE_CODE_ALREADY_EXISTS",
          "An aisle with this code already exists in this warehouse.",
        );
      }
    }
  }

  const updateData: UpdateAisleInput = {
    ...(input.name !== undefined && {
      name: input.name.trim(),
    }),

    ...(input.code !== undefined && {
      code: input.code.trim(),
    }),

    ...(input.status !== undefined && {
      status: input.status,
    }),
  };

  try {
    const updatedAisle = await aisleRepository.update(
      id,
      updateData,
    );

    if (!updatedAisle) {
      throw new NotFoundError("Aisle not found.");
    }

    return updatedAisle;
  } catch (error) {
    if (
      isPostgresUniqueViolation(
        error,
        AISLE_CODE_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "AISLE_CODE_ALREADY_EXISTS",
        "An aisle with this code already exists in this warehouse.",
      );
    }

    throw error;
  }
};

/*
 * Recursive deletion guard: an aisle cannot be removed
 * while any descendant bay -> layer -> storage space
 * holds allocated inventory. Same rule as
 * "warehouse cannot be deleted while it contains
 * inventory," walked down through the new levels.
 */
export const deleteAisle = async (id: string) => {
  await requireRole("ADMIN");

  const aisle = await getAisleById(id);

  const bays = await bayRepository.findManyByAisleId(
    aisle.id,
  );

  for (const bay of bays) {
    const layers =
      await layerRepository.findManyByBayId(bay.id);

    for (const layer of layers) {
      const spaces =
        await storageSpaceRepository.findManyByLayerId(
          layer.id,
        );

      for (const space of spaces) {
        const allocatedQuantity =
          await allocationRepository.getAllocatedQuantityForStorageSpace(
            space.id,
          );

        if (Number(allocatedQuantity) > 0) {
          throw new ConflictError(
            "AISLE_HAS_INVENTORY",
            "Cannot delete an aisle that contains inventory.",
          );
        }
      }
    }
  }

  const deletedAisle = await aisleRepository.remove(id);

  if (!deletedAisle) {
    throw new NotFoundError("Aisle not found.");
  }

  return deletedAisle;
};
