import "server-only";

import Decimal from "decimal.js";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { allocations, items, storageSpaces, warehouses } from "@/db/schema";
import { createInventoryMovementRepository } from "@/repositories/inventory-movement.repository";
import type {
  InventorySummary,
  LowCapacityAlert,
  WarehouseCapacitySummary,
} from "@/types/dashboard";
import type { MovementActivity } from "@/types/inventory-movement";

const movementRepository = createInventoryMovementRepository();

const totalWarehouseCapacitySql = sql<string>`
  (
    SELECT COALESCE(SUM(sp.capacity), 0)
    FROM storage_spaces sp
    WHERE sp.warehouse_id = warehouses.id
  )
`;

const allocatedWarehouseQuantitySql = sql<string>`
  (
    SELECT COALESCE(SUM(al.quantity), 0)
    FROM allocations al
    INNER JOIN storage_spaces sp
      ON sp.id = al.storage_space_id
    WHERE sp.warehouse_id = warehouses.id
  )
`;

const allocatedSpaceQuantitySql = sql<string>`
  (
    SELECT COALESCE(SUM(al.quantity), 0)
    FROM allocations al
    WHERE al.storage_space_id = storage_spaces.id
  )
`;

export const createDashboardRepository = () => {
  const getInventorySummary = async (): Promise<InventorySummary> => {
    const [warehouseCounts] = await db
      .select({
        total: sql<string>`COUNT(*)`,
        active: sql<string>`COUNT(*) FILTER (WHERE status = 'ACTIVE')`,
      })
      .from(warehouses);

    const [itemCounts] = await db
      .select({
        total: sql<string>`COUNT(*)`,
      })
      .from(items);

    const [itemsWithInv] = await db
      .select({
        count: sql<string>`COUNT(DISTINCT ${allocations.itemId})`,
      })
      .from(allocations)
      .where(sql`${allocations.quantity} > 0`);

    const [spaceCounts] = await db
      .select({
        total: sql<string>`COUNT(*)`,
        active: sql<string>`COUNT(*) FILTER (WHERE status = 'ACTIVE')`,
      })
      .from(storageSpaces);

    return {
      totalWarehouses: Number(warehouseCounts?.total ?? 0),
      activeWarehouses: Number(warehouseCounts?.active ?? 0),
      totalItems: Number(itemCounts?.total ?? 0),
      itemsWithInventory: Number(itemsWithInv?.count ?? 0),
      totalStorageSpaces: Number(spaceCounts?.total ?? 0),
      activeStorageSpaces: Number(spaceCounts?.active ?? 0),
    };
  };

  const getWarehouseCapacities = async (): Promise<WarehouseCapacitySummary[]> => {
    const rows = await db
      .select({
        id: warehouses.id,
        name: warehouses.name,
        code: warehouses.code,
        totalCapacity: totalWarehouseCapacitySql,
        allocatedQuantity: allocatedWarehouseQuantitySql,
      })
      .from(warehouses)
      .where(eq(warehouses.status, "ACTIVE"))
      .orderBy(warehouses.name);

    return rows.map((row) => {
      const total = new Decimal(row.totalCapacity || "0");
      const allocated = new Decimal(row.allocatedQuantity || "0");

      const percentage = total.greaterThan(0)
        ? allocated.div(total).mul(100).toDecimalPlaces(1).toNumber()
        : 0;

      return {
        id: row.id,
        name: row.name,
        code: row.code,
        allocatedQuantity: allocated.toFixed(3),
        totalCapacity: total.toFixed(3),
        capacityPercentage: percentage,
      };
    });
  };

  const getLowCapacityAlerts = async (): Promise<LowCapacityAlert[]> => {
    const warehouseRows = await db
      .select({
        id: warehouses.id,
        name: warehouses.name,
        code: warehouses.code,
        totalCapacity: totalWarehouseCapacitySql,
        allocatedQuantity: allocatedWarehouseQuantitySql,
      })
      .from(warehouses)
      .where(eq(warehouses.status, "ACTIVE"));

    const spaceRows = await db
      .select({
        id: storageSpaces.id,
        name: storageSpaces.name,
        code: storageSpaces.code,
        totalCapacity: storageSpaces.capacity,
        allocatedQuantity: allocatedSpaceQuantitySql,
      })
      .from(storageSpaces)
      .where(eq(storageSpaces.status, "ACTIVE"));

    const alerts: LowCapacityAlert[] = [];

    for (const row of warehouseRows) {
      const total = new Decimal(row.totalCapacity || "0");
      const allocated = new Decimal(row.allocatedQuantity || "0");

      if (total.greaterThan(0)) {
        const percentage = allocated
          .div(total)
          .mul(100)
          .toDecimalPlaces(1)
          .toNumber();

        if (percentage >= 75) {
          alerts.push({
            id: row.id,
            name: row.name,
            code: row.code,
            type: "WAREHOUSE",
            allocatedQuantity: allocated.toFixed(3),
            totalCapacity: total.toFixed(3),
            capacityPercentage: percentage,
          });
        }
      }
    }

    for (const row of spaceRows) {
      const total = new Decimal(row.totalCapacity || "0");
      const allocated = new Decimal(row.allocatedQuantity || "0");

      if (total.greaterThan(0)) {
        const percentage = allocated
          .div(total)
          .mul(100)
          .toDecimalPlaces(1)
          .toNumber();

        if (percentage >= 75) {
          alerts.push({
            id: row.id,
            name: row.name,
            code: row.code,
            type: "STORAGE_SPACE",
            allocatedQuantity: allocated.toFixed(3),
            totalCapacity: total.toFixed(3),
            capacityPercentage: percentage,
          });
        }
      }
    }

    // Sort alerts by highest capacity percentage first
    return alerts.sort((a, b) => b.capacityPercentage - a.capacityPercentage);
  };

  const getRecentActivity = async (limit = 5): Promise<MovementActivity[]> => {
    return movementRepository.findActivity({}, limit, 0);
  };

  return {
    getInventorySummary,
    getWarehouseCapacities,
    getLowCapacityAlerts,
    getRecentActivity,
  };
};
