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
import { createBayRepository } from "@/repositories/bay.repository";
import { createWarehouseRepository } from "@/repositories/warehouse.repository";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import type {
  CreateBayInput,
  UpdateBayInput,
} from "@/types/bay";

const aisleRepository = createAisleRepository();
const bayRepository = createBayRepository();
const warehouseRepository =
  createWarehouseRepository();
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

  const warehouse = await warehouseRepository.findById(
    aisle.warehouseId,
  );

  assertWarehouseNotDeleted(warehouse, "create a bay");

  const name = normalizeName(input.name);
  const code = normalizeCode(input.code);

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
    throwConflictIfUniqueViolation(
      error,
      BAY_CODE_UNIQUE_CONSTRAINT,
      "BAY_CODE_ALREADY_EXISTS",
      "A bay with this code already exists in this aisle.",
    );
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

  const aisle = await aisleRepository.findById(
    existingBay.aisleId,
  );

  if (!aisle) {
    throw new NotFoundError("Aisle not found.");
  }

  const warehouse = await warehouseRepository.findById(
    aisle.warehouseId,
  );

  assertWarehouseNotDeleted(warehouse, "update a bay");

  if (input.code !== undefined) {
    const code = normalizeCode(input.code);

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
    existingBay.status !== "INACTIVE"
  ) {
    const allocatedQuantity =
      await allocationRepository.getAllocatedQuantityForBay(
        id,
      );

    assertCanDeactivate(
      input.status,
      allocatedQuantity,
      "BAY_HAS_INVENTORY",
      "a bay",
    );
  }

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
    throwConflictIfUniqueViolation(
      error,
      BAY_CODE_UNIQUE_CONSTRAINT,
      "BAY_CODE_ALREADY_EXISTS",
      "A bay with this code already exists in this aisle.",
    );
  }
};

/*
 * Single-query deletion guard: sums all allocations under
 * this bay (layer -> storage space) in one aggregate.
 */
export const deleteBay = async (id: string) => {
  await requireRole("ADMIN");

  const bay = await getBayById(id);

  const allocatedQuantity =
    await allocationRepository.getAllocatedQuantityForBay(
      bay.id,
    );

  if (Number(allocatedQuantity) > 0) {
    throw new ConflictError(
      "BAY_HAS_INVENTORY",
      "Cannot delete a bay that contains inventory.",
    );
  }

  const deletedBay = await bayRepository.remove(id);

  if (!deletedBay) {
    throw new NotFoundError("Bay not found.");
  }

  return deletedBay;
};
