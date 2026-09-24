import "server-only";

import { NotFoundError } from "@/lib/errors/errors";
import {
  clampPageSize,
  resolvePagination,
} from "@/lib/api/pagination";
import { createInventoryMovementRepository } from "@/repositories/inventory-movement.repository";
import { createWarehouseRepository } from "@/repositories/warehouse.repository";
import { createItemRepository } from "@/repositories/item.repository";
import type {
  ListMovementsQuery,
  MovementActivity,
  MovementActivityPage,
} from "@/types/inventory-movement";

const movementRepository =
  createInventoryMovementRepository();

const warehouseRepository = createWarehouseRepository();
const itemRepository = createItemRepository();

/*
 * Service-owned read policy for the activity feed.
 *
 * The repository stays a pure query builder; the service
 * owns input sanitization, abuse caps, and fail-fast
 * foreign-key validation so callers get domain errors
 * instead of silent empty pages.
 */
export const MOVEMENT_MAX_PAGE_SIZE = 100;

export const listInventoryMovements = async (
  query: ListMovementsQuery,
): Promise<MovementActivityPage> => {
  const pageSize = clampPageSize(
    query.pageSize,
    MOVEMENT_MAX_PAGE_SIZE,
  );

  const search = query.search?.trim() || undefined;

  if (query.warehouseId !== undefined) {
    const warehouse = await warehouseRepository.findById(
      query.warehouseId,
    );

    if (!warehouse) {
      throw new NotFoundError("Warehouse not found.");
    }
  }

  if (query.itemId !== undefined) {
    const item = await itemRepository.findById(
      query.itemId,
    );

    if (!item) {
      throw new NotFoundError("Item not found.");
    }
  }

  const filters = {
    ...query,
    pageSize,
    ...(search === undefined
      ? { search: undefined }
      : { search }),
  };

  const total =
    await movementRepository.countActivity(filters);

  const { page, totalPages, offset } = resolvePagination(
    total,
    query.page,
    pageSize,
  );

  const movements =
    await movementRepository.findActivity(
      filters,
      pageSize,
      offset,
    );

  return {
    movements,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
};

/*
 * Type breakdown for the activity header.
 *
 * Reuses countActivity so no repository change is
 * needed — three indexed COUNT(*) queries, no row
 * fetching.
 */
export type MovementTypeSummary = {
  allocate: number;
  move: number;
  release: number;
  total: number;
};

export const getMovementTypeSummary = async (
  filters: Omit<ListMovementsQuery, "page" | "pageSize">,
): Promise<MovementTypeSummary> => {
  const search = filters.search?.trim() || undefined;
  const base = { ...filters, search };

  const [allocate, move, release] = await Promise.all([
    movementRepository.countActivity({
      ...base,
      type: "ALLOCATE",
    }),
    movementRepository.countActivity({
      ...base,
      type: "MOVE",
    }),
    movementRepository.countActivity({
      ...base,
      type: "RELEASE",
    }),
  ]);

  return {
    allocate,
    move,
    release,
    total: allocate + move + release,
  };
};

/*
 * Human-readable one-liner so UI layers don't branch
 * on from/to nullability per movement type.
 *
 *   ALLOCATE 100 pcs of SKU-1 -> WH-A / Aisle-1
 *   MOVE 25 pcs of SKU-1: WH-A / Aisle-1 -> WH-A / Aisle-2
 *   RELEASE 10 pcs of SKU-1 from WH-A / Aisle-2
 */
export const describeMovement = (
  movement: MovementActivity,
): string => {
  const spaceLabel = (
    space: MovementActivity["from"],
  ): string =>
    space
      ? [
          space.warehouseName,
          space.aisleName,
          space.bayName,
          space.layerName,
          `${space.name} (${space.code})`,
        ]
          .filter(Boolean)
          .join(" / ")
      : "—";

  const itemLabel = `${movement.quantity} ${movement.item.unit} of ${movement.item.sku}`;

  switch (movement.type) {
    case "ALLOCATE":
      return `ALLOCATE ${itemLabel} -> ${spaceLabel(movement.to)}`;
    case "MOVE":
      return `MOVE ${itemLabel}: ${spaceLabel(movement.from)} -> ${spaceLabel(movement.to)}`;
    case "RELEASE":
      return `RELEASE ${itemLabel} from ${spaceLabel(movement.from)}`;
  }
};
