import "server-only";

import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { resolvePagination } from "@/lib/api/pagination";
import {
  assertCanDeactivate,
  normalizeCode,
  normalizeName,
  throwConflictIfUniqueViolation,
} from "@/services/helpers/common";
import type {
  CreateWarehouseInput,
  ListWarehousesQuery,
  UpdateWarehouseInput,
  WarehouseListPage,
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
  const code = normalizeCode(input.code);

  const existingWarehouse = await warehouseRepository.findByCode(code);

  if (existingWarehouse) {
    throw new ConflictError(
      "WAREHOUSE_CODE_ALREADY_EXISTS",
      "A warehouse with this code already exists.",
    );
  }

  try {
    return await warehouseRepository.create({
      name: normalizeName(input.name),
      code,
      address: input.address?.trim() || undefined,
    });
  } catch (error) {
    throwConflictIfUniqueViolation(
      error,
      WAREHOUSE_CODE_UNIQUE_CONSTRAINT,
      "WAREHOUSE_CODE_ALREADY_EXISTS",
      "A warehouse with this code already exists.",
    );
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

export const listWarehousesPage = async (
  query: ListWarehousesQuery,
): Promise<WarehouseListPage> => {
  const total = await warehouseRepository.countWarehouses(
    query,
  );

  const { page, totalPages, offset } = resolvePagination(
    total,
    query.page,
    query.pageSize,
  );

  const warehouses =
    await warehouseRepository.findWarehouses(
      query,
      query.pageSize,
      offset,
    );

  return {
    warehouses,
    pagination: {
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
};

export const updateWarehouse = async (
  id: string,
  input: UpdateWarehouseInput,
) => {
  const existingWarehouse = await getWarehouseById(id);

  if (existingWarehouse.deletedAt !== null) {
    throw new ConflictError(
      "WAREHOUSE_DELETED",
      "Cannot update a deleted warehouse.",
    );
  }

  if (input.code !== undefined) {
    const code = normalizeCode(input.code);

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
      name: normalizeName(input.name),
    }),
    ...(input.code !== undefined && {
      code: normalizeCode(input.code),
    }),
    ...(input.address !== undefined && {
      address: input.address?.trim() || null,
    }),
    ...(input.status !== undefined && {
      status: input.status,
    }),
  };

  /*
   * Deactivation must obey the same inventory rule as
   * deletion — otherwise callers bypass the delete
   * guard by setting status to INACTIVE.
   */
  if (
    input.status === "INACTIVE" &&
    existingWarehouse.status !== "INACTIVE"
  ) {
    const allocatedQuantity =
      await allocationRepository.getAllocatedQuantityForWarehouse(
        id,
      );

    assertCanDeactivate(
      input.status,
      allocatedQuantity,
      "WAREHOUSE_HAS_INVENTORY",
      "a warehouse",
    );
  }

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
    throwConflictIfUniqueViolation(
      error,
      WAREHOUSE_CODE_UNIQUE_CONSTRAINT,
      "WAREHOUSE_CODE_ALREADY_EXISTS",
      "A warehouse with this code already exists.",
    );
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