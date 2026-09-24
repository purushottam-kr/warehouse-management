import "server-only";

import Decimal from "decimal.js";

import { requireAuth } from "@/lib/auth/authorization";
import { createDashboardRepository } from "@/repositories/dashboard.repository";
import type {
  LowCapacityAlert,
  WarehouseCapacitySummary,
} from "@/types/dashboard";
import type { DashboardOverview } from "@/types/dashboard";

const dashboardRepository = createDashboardRepository();

/*
 * Business policy owned by the service (not the repository):
 * utilization at or above this percentage raises an alert.
 */
export const LOW_CAPACITY_THRESHOLD_PERCENT = 75;

const toPercentage = (
  totalRaw: string,
  allocatedRaw: string,
): number => {
  const total = new Decimal(totalRaw || "0");
  const allocated = new Decimal(allocatedRaw || "0");

  if (total.lessThanOrEqualTo(0)) {
    return 0;
  }

  return allocated
    .div(total)
    .mul(100)
    .toDecimalPlaces(1)
    .toNumber();
};

export const getDashboardOverview =
  async (): Promise<DashboardOverview> => {
    await requireAuth();

    const [
      summary,
      warehouseTotals,
      spaceTotals,
      recentActivity,
    ] = await Promise.all([
      dashboardRepository.getInventorySummary(),
      dashboardRepository.getWarehouseCapacityTotals(),
      dashboardRepository.getStorageSpaceCapacityTotals(),
      dashboardRepository.getRecentActivity(5),
    ]);

    const warehouseCapacities: WarehouseCapacitySummary[] =
      warehouseTotals.map((row) => {
        const percentage = toPercentage(
          row.totalCapacity,
          row.allocatedQuantity,
        );

        return {
          id: row.id,
          name: row.name,
          code: row.code,
          allocatedQuantity: new Decimal(
            row.allocatedQuantity || "0",
          ).toFixed(3),
          totalCapacity: new Decimal(
            row.totalCapacity || "0",
          ).toFixed(3),
          capacityPercentage: percentage,
        };
      });

    const lowCapacityAlerts: LowCapacityAlert[] = [
      ...warehouseTotals
        .map((row) => ({
          row,
          type: "WAREHOUSE" as const,
          percentage: toPercentage(
            row.totalCapacity,
            row.allocatedQuantity,
          ),
        }))
        .filter(
          ({ row, percentage }) =>
            new Decimal(row.totalCapacity || "0").greaterThan(
              0,
            ) &&
            percentage >= LOW_CAPACITY_THRESHOLD_PERCENT,
        )
        .map(({ row, percentage }) => ({
          id: row.id,
          name: row.name,
          code: row.code,
          type: "WAREHOUSE" as const,
          allocatedQuantity: new Decimal(
            row.allocatedQuantity || "0",
          ).toFixed(3),
          totalCapacity: new Decimal(
            row.totalCapacity || "0",
          ).toFixed(3),
          capacityPercentage: percentage,
        })),
      ...spaceTotals
        .map((row) => ({
          row,
          percentage: toPercentage(
            row.totalCapacity,
            row.allocatedQuantity,
          ),
        }))
        .filter(
          ({ row, percentage }) =>
            new Decimal(row.totalCapacity || "0").greaterThan(
              0,
            ) &&
            percentage >= LOW_CAPACITY_THRESHOLD_PERCENT,
        )
        .map(({ row, percentage }) => ({
          id: row.id,
          name: row.name,
          code: row.code,
          type: "STORAGE_SPACE" as const,
          allocatedQuantity: new Decimal(
            row.allocatedQuantity || "0",
          ).toFixed(3),
          totalCapacity: new Decimal(
            row.totalCapacity || "0",
          ).toFixed(3),
          capacityPercentage: percentage,
        })),
    ].sort(
      (a, b) => b.capacityPercentage - a.capacityPercentage,
    );

    return {
      summary,
      warehouseCapacities,
      lowCapacityAlerts,
      recentActivity,
    };
  };
