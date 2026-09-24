import "server-only";

import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { isPostgresUniqueViolation } from "@/lib/errors/database";

/*
 * Shared guards for the CRUD services (warehouse, aisle,
 * bay, layer, storage-space, item).
 *
 * These extract the three patterns every service
 * duplicated:
 *
 * 1. trim-on-write for name/code inputs
 * 2. pre-check + UNIQUE-constraint catch for codes
 * 3. "cannot deactivate/delete with inventory" guards
 */

export const normalizeCode = (code: string): string => {
  return code.trim();
};

export const normalizeName = (name: string): string => {
  return name.trim();
};

/*
 * The pre-check in each service gives a clean domain
 * error; the UNIQUE constraint remains the actual
 * concurrency protection. Call this from catch blocks
 * so concurrent inserts map to the same ConflictError.
 */
export const throwConflictIfUniqueViolation = (
  error: unknown,
  constraint: string,
  code: string,
  message: string,
): never => {
  if (isPostgresUniqueViolation(error, constraint)) {
    throw new ConflictError(code, message);
  }

  throw error;
};

/*
 * Deactivation guard: mirrors the existing deletion
 * guard ("cannot delete X that contains inventory").
 * Without it, callers bypass the delete guard by
 * setting status to INACTIVE instead.
 */
export const assertCanDeactivate = (
  nextStatus: string | undefined,
  allocatedQuantity: string | number,
  conflictCode: string,
  entityLabel: string,
): void => {
  if (nextStatus !== "INACTIVE") {
    return;
  }

  if (Number(allocatedQuantity) > 0) {
    throw new ConflictError(
      conflictCode,
      `Cannot deactivate ${entityLabel} that contains inventory.`,
    );
  }
};

/*
 * Deleted-warehouse guard. Creates already check
 * `warehouse.deletedAt !== null`; updates must check
 * the same so a deleted subtree stays read-only.
 */
export const assertWarehouseNotDeleted = (
  warehouse: { deletedAt: Date | null } | null | undefined,
  action: string,
): void => {
  if (!warehouse) {
    throw new NotFoundError("Warehouse not found.");
  }

  if (warehouse.deletedAt !== null) {
    throw new ConflictError(
      "WAREHOUSE_DELETED",
      `Cannot ${action} in a deleted warehouse.`,
    );
  }
};
