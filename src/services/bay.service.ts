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
import { createAllocationRepository } from "@/repositories/allocation.repository";
import type {
  CreateBayInput,
  UpdateBayInput,
} from "@/types/bay";

const aisleRepository = createAisleRepository();
const bayRepository = createBayRepository();
const layerRepository = createLayerRepository();
const storageSpaceRepository =
  createStorageSpaceRepository();
const allocationRepository =
  createAllocationRepository();

const BAY_CODE_UNIQUE_CONSTRAINT =
  "bays_aisle_code_unique";

export const createBay = async (
  input: CreateBayInput,
) => {
  const aisle = await aisleRepository.findById(
    input.aisleId,
  );

  if (!aisle) {
    throw new NotFoundError("Aisle not found.");
  }

  const name = input.name.trim();
  const code = input.code.trim();

  const existingBay = await bayRepository.findByCode(
    input.aisleId,
    code,
  );

  if (existingBay) {
    throw new ConflictError(
      "BAY_CODE_ALREADY_EXISTS",
      "A bay with this code already exists in this aisle.",
    );
  }

  try {
    return await bayRepository.create({
      aisleId: input.aisleId,
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
        BAY_CODE_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "BAY_CODE_ALREADY_EXISTS",
        "A bay with this code already exists in this aisle.",
      );
    }

    throw error;
  }
};

export const getBayById = async (id: string) => {
  const bay = await bayRepository.findById(id);

  if (!bay) {
    throw new NotFoundError("Bay not found.");
  }

  return bay;
};

export const listBaysByAisle = async (
  aisleId: string,
) => {
  const aisle = await aisleRepository.findById(aisleId);

  if (!aisle) {
    throw new NotFoundError("Aisle not found.");
  }

  return bayRepository.findManyByAisleId(aisleId);
};

export const updateBay = async (
  id: string,
  input: UpdateBayInput,
) => {
  const existingBay = await getBayById(id);

  if (input.code !== undefined) {
    const code = input.code.trim();

    if (code !== existingBay.code) {
      const existingWithCode =
        await bayRepository.findByCode(
          existingBay.aisleId,
          code,
        );

      if (existingWithCode) {
        throw new ConflictError(
          "BAY_CODE_ALREADY_EXISTS",
          "A bay with this code already exists in this aisle.",
        );
      }
    }
  }

  const updateData: UpdateBayInput = {
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
    const updatedBay = await bayRepository.update(
      id,
      updateData,
    );

    if (!updatedBay) {
      throw new NotFoundError("Bay not found.");
    }

    return updatedBay;
  } catch (error) {
    if (
      isPostgresUniqueViolation(
        error,
        BAY_CODE_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "BAY_CODE_ALREADY_EXISTS",
        "A bay with this code already exists in this aisle.",
      );
    }

    throw error;
  }
};

/*
 * Recursive deletion guard: a bay cannot be removed
 * while any descendant layer -> storage space holds
 * allocated inventory.
 */
export const deleteBay = async (id: string) => {
  await requireRole("ADMIN");

  const bay = await getBayById(id);

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
          "BAY_HAS_INVENTORY",
          "Cannot delete a bay that contains inventory.",
        );
      }
    }
  }

  const deletedBay = await bayRepository.remove(id);

  if (!deletedBay) {
    throw new NotFoundError("Bay not found.");
  }

  return deletedBay;
};
