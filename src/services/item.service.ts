import "server-only";

import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { isPostgresUniqueViolation } from "@/lib/errors/database";
import { createItemRepository } from "@/repositories/item.repository";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import type {
  CreateItemInput,
  UpdateItemInput,
} from "@/types/item";
import { normalizeStorageType } from "@/lib/inventory/storage-type";

const itemRepository = createItemRepository();
const allocationRepository =
  createAllocationRepository();

const ITEMS_SKU_UNIQUE_CONSTRAINT =
  "items_sku_unique";

export const createItem = async (
  input: CreateItemInput,
) => {
  const sku = input.sku.trim();
  const name = input.name.trim();
  const unit = input.unit.trim();

  const description =
    input.description?.trim() || undefined;

  const requiredStorageType =
  input.requiredStorageType
    ? normalizeStorageType(
        input.requiredStorageType,
      )
    : undefined;

  /*
   * This pre-check gives the user a clean domain error.
   *
   * PostgreSQL's UNIQUE constraint remains the actual
   * concurrency protection for two requests creating the
   * same SKU at the same time.
   */
  const existingItem =
    await itemRepository.findBySku(sku);

  if (existingItem) {
    throw new ConflictError(
      "ITEM_SKU_ALREADY_EXISTS",
      "An item with this SKU already exists.",
    );
  }

  try {
    return await itemRepository.create({
      sku,
      name,
      unit,
      ...(description !== undefined && {
        description,
      }),
      ...(requiredStorageType !== undefined && {
        requiredStorageType,
      }),
    });
  } catch (error) {
    if (
      isPostgresUniqueViolation(
        error,
        ITEMS_SKU_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "ITEM_SKU_ALREADY_EXISTS",
        "An item with this SKU already exists.",
      );
    }

    throw error;
  }
};

export const getItemById = async (
  id: string,
) => {
  const item =
    await itemRepository.findById(id);

  if (!item) {
    throw new NotFoundError("Item not found.");
  }

  return item;
};

export const listItems = async () => {
  return itemRepository.findMany();
};

export const updateItem = async (
  id: string,
  input: UpdateItemInput,
) => {
  const existingItem =
    await getItemById(id);

  const updateData: UpdateItemInput = {};

  if (input.sku !== undefined) {
    const sku = input.sku.trim();

    if (sku !== existingItem.sku) {
      const existingWithSku =
        await itemRepository.findBySku(sku);

      if (existingWithSku) {
        throw new ConflictError(
          "ITEM_SKU_ALREADY_EXISTS",
          "An item with this SKU already exists.",
        );
      }

      updateData.sku = sku;
    }
  }

  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }

  if (input.description !== undefined) {
    updateData.description =
      input.description?.trim() || null;
  }

  if (input.unit !== undefined) {
    updateData.unit = input.unit.trim();
  }

  /*
   * Storage-type compatibility is enforced during allocation.
   *
   * We allow this field to be changed here because the Item
   * service does not own allocation compatibility.
   *
   * If future product requirements require changing this
   * restriction, the allocation repository can be consulted
   * here before allowing the update.
   */
  if (input.requiredStorageType !== undefined) {
    updateData.requiredStorageType =
      input.requiredStorageType
    ? normalizeStorageType(
        input.requiredStorageType,
      )
    : null;
  }

  /*
   * Nothing changed.
   *
   * Returning the existing record avoids issuing an unnecessary
   * UPDATE and keeps PATCH idempotent.
   */
  if (Object.keys(updateData).length === 0) {
    return existingItem;
  }

  try {
    const updatedItem =
      await itemRepository.update(
        id,
        updateData,
      );

    if (!updatedItem) {
      throw new NotFoundError("Item not found.");
    }

    return updatedItem;
  } catch (error) {
    if (
      isPostgresUniqueViolation(
        error,
        ITEMS_SKU_UNIQUE_CONSTRAINT,
      )
    ) {
      throw new ConflictError(
        "ITEM_SKU_ALREADY_EXISTS",
        "An item with this SKU already exists.",
      );
    }

    throw error;
  }
};

export const deleteItem = async (id: string) => {
  const item = await getItemById(id);

  const allocatedQuantity =
    await allocationRepository.getAllocatedQuantityForItem(
      item.id,
    );

  if (Number(allocatedQuantity) > 0) {
    throw new ConflictError(
      "ITEM_HAS_INVENTORY",
      "Cannot delete an item that has allocated inventory.",
    );
  }

  const deletedItem =
    await itemRepository.remove(id);

  if (!deletedItem) {
    throw new NotFoundError("Item not found.");
  }

  return deletedItem;
};