import "server-only";

import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { isPostgresUniqueViolation } from "@/lib/errors/database";
import { requireRole } from "@/lib/auth/authorization";
import { createBayRepository } from "@/repositories/bay.repository";
import { createLayerRepository } from "@/repositories/layer.repository";
import { createStorageSpaceRepository } from "@/repositories/storage-space.repository";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import type {
  CreateLayerInput,
  UpdateLayerInput,
} from "@/types/layer";

const bayRepository = createBayRepository();
const layerRepository = createLayerRepository();
const storageSpaceRepository =
  createStorageSpaceRepository();
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

  const name = input.name.trim();
  const code = input.code.trim();

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
    if (
      isPostgresUniqueViolation(
        error,
        LAYER_CODE_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "LAYER_CODE_ALREADY_EXISTS",
        "A layer with this code already exists in this bay.",
      );
    }

    throw error;
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

  if (input.code !== undefined) {
    const code = input.code.trim();

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
    const updatedLayer = await layerRepository.update(
      id,
      updateData,
    );

    if (!updatedLayer) {
      throw new NotFoundError("Layer not found.");
    }

    return updatedLayer;
  } catch (error) {
    if (
      isPostgresUniqueViolation(
        error,
        LAYER_CODE_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "LAYER_CODE_ALREADY_EXISTS",
        "A layer with this code already exists in this bay.",
      );
    }

    throw error;
  }
};

/*
 * Deletion guard: a layer cannot be removed while any
 * of its storage spaces holds allocated inventory.
 * This is the base case of the recursive guard —
 * bay and aisle walk down to this same check.
 */
export const deleteLayer = async (id: string) => {
  await requireRole("ADMIN");

  const layer = await getLayerById(id);

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
        "LAYER_HAS_INVENTORY",
        "Cannot delete a layer that contains inventory.",
      );
    }
  }

  const deletedLayer = await layerRepository.remove(id);

  if (!deletedLayer) {
    throw new NotFoundError("Layer not found.");
  }

  return deletedLayer;
};
