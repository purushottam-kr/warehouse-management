import "server-only";

import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { requireRole } from "@/lib/auth/authorization";
import {
  assertCanDeactivate,
  assertWarehouseNotDeleted,
  normalizeCode,
  normalizeName,
  throwConflictIfUniqueViolation,
} from "@/services/helpers/common";
import { createAisleRepository } from "@/repositories/aisle.repository";
import { createWarehouseRepository } from "@/repositories/warehouse.repository";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import type {
  CreateAisleInput,
  UpdateAisleInput,
} from "@/types/aisle";

const aisleRepository = createAisleRepository();
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

  assertWarehouseNotDeleted(warehouse, "create an aisle");

  const name = normalizeName(input.name);
  const code = normalizeCode(input.code);

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
    throwConflictIfUniqueViolation(
      error,
      AISLE_CODE_UNIQUE_CONSTRAINT,
      "AISLE_CODE_ALREADY_EXISTS",
      "An aisle with this code already exists in this warehouse.",
    );
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

  const warehouse = await warehouseRepository.findById(
    existingAisle.warehouseId,
  );

  assertWarehouseNotDeleted(warehouse, "update an aisle");

  if (input.code !== undefined) {
    const code = normalizeCode(input.code);

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
      name: normalizeName(input.name),
    }),

    ...(input.code !== undefined && {
      code: normalizeCode(input.code),
    }),

    ...(input.status !== undefined && {
      status: input.status,
    }),
  };

  if (
    input.status === "INACTIVE" &&
    existingAisle.status !== "INACTIVE"
  ) {
    const allocatedQuantity =
      await allocationRepository.getAllocatedQuantityForAisle(
        id,
      );

    assertCanDeactivate(
      input.status,
      allocatedQuantity,
      "AISLE_HAS_INVENTORY",
      "an aisle",
    );
  }

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
    throwConflictIfUniqueViolation(
      error,
      AISLE_CODE_UNIQUE_CONSTRAINT,
      "AISLE_CODE_ALREADY_EXISTS",
      "An aisle with this code already exists in this warehouse.",
    );
  }
};

/*
 * Single-query deletion guard: sums all allocations under
 * this aisle (bay -> layer -> space) in one aggregate.
 * Same rule as "warehouse cannot be deleted while it
 * contains inventory," scoped to the subtree.
 */
export const deleteAisle = async (id: string) => {
  await requireRole("ADMIN");

  const aisle = await getAisleById(id);

  const allocatedQuantity =
    await allocationRepository.getAllocatedQuantityForAisle(
      aisle.id,
    );

  if (Number(allocatedQuantity) > 0) {
    throw new ConflictError(
      "AISLE_HAS_INVENTORY",
      "Cannot delete an aisle that contains inventory.",
    );
  }

  const deletedAisle = await aisleRepository.remove(id);

  if (!deletedAisle) {
    throw new NotFoundError("Aisle not found.");
  }

  return deletedAisle;
};
