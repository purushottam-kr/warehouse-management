import "server-only";

import {
  AppError,
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { isPostgresUniqueViolation } from "@/lib/errors/database";
import {
  ITEM_EXPORT_MAX_ROWS,
  ITEM_IMPORT_MAX_ROWS,
  mapItemCsvHeader,
  parseCsvText,
} from "@/lib/csv/item-csv";
import { createItemSchema } from "@/lib/validators/item";
import { db } from "@/db";
import { createItemRepository } from "@/repositories/item.repository";
import { createAllocationRepository } from "@/repositories/allocation.repository";
import type {
  CreateItemInput,
  ItemListPage,
  ListItemQuery,
  UpdateItemInput,
} from "@/types/item";
import { normalizeStorageType } from "@/lib/inventory/storage-type";
import { resolvePagination } from "@/lib/api/pagination";

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

export const listItemsPage = async (
  query: ListItemQuery,
): Promise<ItemListPage> => {
  const total = await itemRepository.countItems(query);

  const { page, totalPages, offset } = resolvePagination(
    total,
    query.page,
    query.pageSize,
  );

  const items = await itemRepository.findItems(
    query,
    query.pageSize,
    offset,
  );

  return {
    items,
    pagination: {
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
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

/*
 * CSV export read model (V2-5).
 *
 * Reuses the list filters so an export with the current
 * search/filter state matches the items table.
 */
export const exportItems = async (filters: {
  search?: string;
  warehouseId?: string;
  storageSpaceId?: string;
}) => {
  /*
   * Fetch one row past the cap so an oversized export fails
   * with a clear message instead of silent truncation.
   */
  const rows = await itemRepository.findItemsForExport(
    filters,
    ITEM_EXPORT_MAX_ROWS + 1,
  );

  if (rows.length > ITEM_EXPORT_MAX_ROWS) {
    throw new AppError(
      400,
      "EXPORT_TOO_LARGE",
      `Export is limited to ${ITEM_EXPORT_MAX_ROWS} items. Narrow the filters and try again.`,
    );
  }

  return rows;
};

export type ItemCsvImportRowError = {
  row: number;
  sku?: string;
  messages: string[];
};

export type ItemCsvImportOutcome =
  | {
      ok: true;
      created: number;
      rejected: 0;
      errors: [];
    }
  | {
      ok: false;
      fileError: string;
      created: 0;
      rejected: number;
      errors: ItemCsvImportRowError[];
    };

/*
 * All-or-nothing transactional CSV import (V2-5).
 *
 * The entire file is parsed and validated before any write:
 * a single invalid row means zero rows are created. Callers
 * report `created: 0` with per-row errors in that case.
 */
export const importItemsFromCsvText = async (
  csvText: string,
): Promise<ItemCsvImportOutcome> => {
  let table: string[][];

  try {
    table = parseCsvText(csvText);
  } catch {
    return {
      ok: false,
      fileError:
        "Unable to parse the CSV file. Check for unbalanced quotes.",
      created: 0,
      rejected: 0,
      errors: [],
    };
  }

  const nonEmpty = table.filter((row) =>
    row.some((cell) => cell.trim() !== ""),
  );

  if (nonEmpty.length === 0) {
    return {
      ok: false,
      fileError:
        "The CSV file is empty. Include a header row and at least one item.",
      created: 0,
      rejected: 0,
      errors: [],
    };
  }

  const headerRow = nonEmpty[0] as string[];

  const columnIndex = new Map<string, number>();

  for (let index = 0; index < headerRow.length; index += 1) {
    const key = mapItemCsvHeader(
      headerRow[index] as string,
    );

    if (key && !columnIndex.has(key)) {
      columnIndex.set(key, index);
    }
  }

  const missing = ["sku", "name", "unit"].filter(
    (required) => !columnIndex.has(required),
  );

  if (missing.length > 0) {
    return {
      ok: false,
      fileError: `Missing required CSV columns: ${missing.join(", ")}. Expected header: sku, name, description, unit, requiredStorageType.`,
      created: 0,
      rejected: 0,
      errors: [],
    };
  }

  /*
   * Line numbers are 1-based over the original file so the
   * reported row matches what the user sees in a spreadsheet.
   * Blank lines are skipped without shifting later numbers.
   */
  let dataRowCount = 0;

  for (const row of table.slice(1)) {
    if (row.some((cell) => cell.trim() !== "")) {
      dataRowCount += 1;
    }
  }

  if (dataRowCount === 0) {
    return {
      ok: false,
      fileError:
        "The CSV file has a header but no item rows.",
      created: 0,
      rejected: 0,
      errors: [],
    };
  }

  if (dataRowCount > ITEM_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      fileError: `The file contains ${dataRowCount} rows. Maximum allowed is ${ITEM_IMPORT_MAX_ROWS}.`,
      created: 0,
      rejected: dataRowCount,
      errors: [],
    };
  }

  const readColumn = (
    row: string[],
    key: string,
  ): string => {
    const index = columnIndex.get(key);

    if (index === undefined) {
      return "";
    }

    return row[index] ?? "";
  };

  const errors: ItemCsvImportRowError[] = [];
  const validInputs: CreateItemInput[] = [];
  const seenSkus = new Map<string, number>();

  table.slice(1).forEach((row, sliceIndex) => {
    if (!row.some((cell) => cell.trim() !== "")) {
      return;
    }

    /* +2: header is line 1, slice is zero-based. */
    const lineNumber = sliceIndex + 2;

    const rawSku = readColumn(row, "sku");

    const record = {
      sku: rawSku,
      name: readColumn(row, "name"),
      description:
        readColumn(row, "description") || undefined,
      unit: readColumn(row, "unit"),
      requiredStorageType:
        readColumn(row, "requiredStorageType") ||
        undefined,
    };

    const parsed = createItemSchema.safeParse(record);

    if (!parsed.success) {
      const flattened = parsed.error.flatten();

      const messages = [
        ...flattened.formErrors,
        ...Object.entries(
          flattened.fieldErrors,
        ).flatMap(([field, fieldMessages]) =>
          (fieldMessages ?? []).map(
            (message) => `${field}: ${message}`,
          ),
        ),
      ];

      errors.push({
        row: lineNumber,
        ...(rawSku.trim() !== "" && {
          sku: rawSku.trim(),
        }),
        messages,
      });

      return;
    }

    const sku = parsed.data.sku.trim();
    const firstSeen = seenSkus.get(sku);

    if (firstSeen !== undefined) {
      errors.push({
        row: lineNumber,
        sku,
        messages: [
          `sku: Duplicate SKU in file (first seen on row ${firstSeen}).`,
        ],
      });

      return;
    }

    seenSkus.set(sku, lineNumber);
    validInputs.push(parsed.data);
  });

  /*
   * Duplicate protection against existing rows. Only
   * validated SKUs are queried so malformed values never
   * reach the database.
   */
  if (validInputs.length > 0) {
    const existing = await itemRepository.findBySkus(
      validInputs.map((input) => input.sku.trim()),
    );

    const existingSkus = new Set(
      existing.map((item) => item.sku),
    );

    const deduplicated: CreateItemInput[] = [];

    for (const input of validInputs) {
      const sku = input.sku.trim();

      if (existingSkus.has(sku)) {
        const lineNumber = seenSkus.get(sku) ?? 0;

        errors.push({
          row: lineNumber,
          sku,
          messages: [
            "sku: An item with this SKU already exists.",
          ],
        });
      } else {
        deduplicated.push(input);
      }
    }

    validInputs.length = 0;
    validInputs.push(...deduplicated);
  }

  if (errors.length > 0) {
    errors.sort((a, b) => a.row - b.row);

    return {
      ok: false,
      fileError: `${errors.length} of ${dataRowCount} rows failed validation. No items were imported.`,
      created: 0,
      rejected: errors.length,
      errors,
    };
  }

  const normalized = validInputs.map((input) => {
    const description = input.description?.trim();

    const requiredStorageType =
      input.requiredStorageType?.trim();

    return {
      sku: input.sku.trim(),
      name: input.name.trim(),
      unit: input.unit.trim(),
      ...(description && { description }),
      ...(requiredStorageType && {
        requiredStorageType: normalizeStorageType(
          requiredStorageType,
        ),
      }),
    };
  });

  try {
    await db.transaction(async (tx) => {
      await itemRepository.createMany(normalized, tx);
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
        "An item with this SKU already exists. No items were imported.",
      );
    }

    throw error;
  }

  return {
    ok: true,
    created: normalized.length,
    rejected: 0,
    errors: [],
  };
};