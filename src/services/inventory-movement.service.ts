import "server-only";

import { createInventoryMovementRepository } from "@/repositories/inventory-movement.repository";
import type {
  ListMovementsQuery,
  MovementActivityPage,
} from "@/types/inventory-movement";

const movementRepository =
  createInventoryMovementRepository();

export const listInventoryMovements = async (
  query: ListMovementsQuery,
): Promise<MovementActivityPage> => {
  const total =
    await movementRepository.countActivity(query);

  const totalPages = Math.max(
    1,
    Math.ceil(total / query.pageSize),
  );

  /*
   * Clamp the requested page into the valid range so
   * stale page numbers degrade to the nearest valid
   * page instead of an empty result.
   */
  const page = Math.min(query.page, totalPages);

  const movements =
    await movementRepository.findActivity(
      query,
      query.pageSize,
      (page - 1) * query.pageSize,
    );

  return {
    movements,
    pagination: {
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
};
