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
import { createLayerRepository } from "@/repositories/layer.repository";
import { createWarehouseRepository } from "@/repositories/warehouse.repository";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import type {
  CreateLayerInput,
  UpdateLayerInput,
} from "@/types/layer";

const aisleRepository = createAisleRepository();
const bayRepository = createBayRepository();
const layerRepository = createLayerRepository();
const warehouseRepository =
  createWarehouseRepository();
const allocationRepository =
  createAllocationRepository();

const LAYER_CODE_UNIQUE_CONSTRAINT =
  "layers_bay_code_unique";

export const createLayer = async (
  input: CreateLayerInput,
) => {
  const bay = await bayRepository.findById(
    input.bayId,
  );

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

  assertWarehouseNotDeleted(warehouse, "create a layer");

  const name = normalizeName(input.name);
  const code = normalizeCode(input.code);

  const existingLayer =
    await layerRepository.findByCode(
      input.bayId,
      code,
    );

  if (existingLayer) {
    throw new ConflictError(
      "LAYER_CODE_ALREADY_EXISTS",
      "A layer with this code already exists in this bay.",
    );
  }

  try {
    return await layerRepository.create({
      bayId: input.bayId,
      name,
      code,
    });
  } catch (error) {
    // The pre-check above improves the error response,
    // but PostgreSQL's UNIQUE constraint is the actual
    // concurrency protection.
    throwConflictIfUniqueViolation(
      error,
      LAYER_CODE_UNIQUE_CONSTRAINT,
      "LAYER_CODE_ALREADY_EXISTS",
      "A layer with this code already exists in this bay.",
    );
  }
};

export const getLayerById = async (id: string) => {
  const layer = await layerRepository.findById(id);

  if (!layer) {
    throw new NotFoundError("Layer not found.");
  }

  return layer;
};

export const listLayersByBay = async (
  bayId: string,
) => {
  const bay = await bayRepository.findById(bayId);

  if (!bay) {
    throw new NotFoundError("Bay not found.");
  }

  return layerRepository.findManyByBayId(bayId);
};

export const updateLayer = async (
  id: string,
  input: UpdateLayerInput,
) => {
  const existingLayer = await getLayerById(id);

  const bay = await bayRepository.findById(
    existingLayer.bayId,
  );

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

  assertWarehouseNotDeleted(warehouse, "update a layer");

  if (input.code !== undefined) {
    const code = normalizeCode(input.code);

    if (code !== existingLayer.code) {
      const existingWithCode =
        await layerRepository.findByCode(
          existingLayer.bayId,
          code,
        );

      if (existingWithCode) {
        throw new ConflictError(
          "LAYER_CODE_ALREADY_EXISTS",
          "A layer with this code already exists in this bay.",
        );
      }
    }
  }

  const updateData: UpdateLayerInput = {
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
    existingLayer.status !== "INACTIVE"
  ) {
    const allocatedQuantity =
      await allocationRepository.getAllocatedQuantityForLayer(
        id,
      );

    assertCanDeactivate(
      input.status,
      allocatedQuantity,
      "LAYER_HAS_INVENTORY",
      "a layer",
    );
  }

  try {
    const updatedLayer = await layerRepository.update(
      id,
      updateData,
    );

    if (!updatedLayer) {
      throw new NotFoundError("Layer not found.");
    }

    return updatedLayer;
  } catch (error) {
    throwConflictIfUniqueViolation(
      error,
      LAYER_CODE_UNIQUE_CONSTRAINT,
      "LAYER_CODE_ALREADY_EXISTS",
      "A layer with this code already exists in this bay.",
    );
  }
};

/*
 * Single-query deletion guard: sums all allocations in
 * this layer's storage spaces in one aggregate.
 * Base case of the hierarchy guard — bay and aisle
 * use the same pattern scoped to their subtree.
 */
export const deleteLayer = async (id: string) => {
  await requireRole("ADMIN");

  const layer = await getLayerById(id);

  const allocatedQuantity =
    await allocationRepository.getAllocatedQuantityForLayer(
      layer.id,
    );

  if (Number(allocatedQuantity) > 0) {
    throw new ConflictError(
      "LAYER_HAS_INVENTORY",
      "Cannot delete a layer that contains inventory.",
    );
  }

  const deletedLayer = await layerRepository.remove(id);

  if (!deletedLayer) {
    throw new NotFoundError("Layer not found.");
  }

  return deletedLayer;
};
