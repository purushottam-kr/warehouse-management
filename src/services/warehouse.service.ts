import "server-only";

import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { isPostgresUniqueViolation } from "@/lib/errors/database";
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
} from "@/types/warehouse";
import { createWarehouseRepository } from "@/repositories/warehouse.repository";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import { requireRole } from "@/lib/auth/authorization";

const warehouseRepository = createWarehouseRepository();
const allocationRepository = createAllocationRepository();

const WAREHOUSE_CODE_UNIQUE_CONSTRAINT = "warehouses_code_unique";

export const createWarehouse = async (
  input: CreateWarehouseInput,
) => {
  const code = input.code.trim();

  const existingWarehouse = await warehouseRepository.findByCode(code);

  if (existingWarehouse) {
    throw new ConflictError(
      "WAREHOUSE_CODE_ALREADY_EXISTS",
      "A warehouse with this code already exists.",
    );
  }

  try {
    return await warehouseRepository.create({
      name: input.name.trim(),
      code,
      address: input.address?.trim() || undefined,
    });
  } catch (error) {
    if (
      isPostgresUniqueViolation(
        error,
        WAREHOUSE_CODE_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "WAREHOUSE_CODE_ALREADY_EXISTS",
        "A warehouse with this code already exists.",
      );
    }

    throw error;
  }
};

export const getWarehouseById = async (id: string) => {
  const warehouse = await warehouseRepository.findById(id);

  if (!warehouse) {
    throw new NotFoundError("Warehouse not found.");
  }

  return warehouse;
};

export const listWarehouses = async () => {
  return warehouseRepository.findMany();
};

export const updateWarehouse = async (
  id: string,
  input: UpdateWarehouseInput,
) => {
  const existingWarehouse = await getWarehouseById(id);

  if (input.code !== undefined) {
    const code = input.code.trim();

    if (code !== existingWarehouse.code) {
      const warehouseWithSameCode =
        await warehouseRepository.findByCode(code);

      if (
        warehouseWithSameCode &&
        warehouseWithSameCode.id !== id
      ) {
        throw new ConflictError(
          "WAREHOUSE_CODE_ALREADY_EXISTS",
          "A warehouse with this code already exists.",
        );
      }
    }
  }

  const updateData: UpdateWarehouseInput = {
    ...(input.name !== undefined && {
      name: input.name.trim(),
    }),
    ...(input.code !== undefined && {
      code: input.code.trim(),
    }),
    ...(input.address !== undefined && {
      address: input.address?.trim() || null,
    }),
    ...(input.status !== undefined && {
      status: input.status,
    }),
  };

  try {
    const updatedWarehouse = await warehouseRepository.update(
      id,
      updateData,
    );

    if (!updatedWarehouse) {
      throw new NotFoundError("Warehouse not found.");
    }

    return updatedWarehouse;
  } catch (error) {
    if (
      isPostgresUniqueViolation(
        error,
        WAREHOUSE_CODE_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "WAREHOUSE_CODE_ALREADY_EXISTS",
        "A warehouse with this code already exists.",
      );
    }

    throw error;
  }
};

export const deleteWarehouse = async (id: string) => {
  await requireRole("ADMIN");

  const warehouse = await getWarehouseById(id);

  const allocatedQuantity =
    await allocationRepository.getAllocatedQuantityForWarehouse(
      warehouse.id,
    );

  if (Number(allocatedQuantity) > 0) {
    throw new ConflictError(
      "WAREHOUSE_HAS_INVENTORY",
      "Cannot delete a warehouse that contains inventory.",
    );
  }

  const deletedWarehouse =
    await warehouseRepository.remove(id);

  if (!deletedWarehouse) {
    throw new NotFoundError("Warehouse not found.");
  }

  return deletedWarehouse;
};