import "server-only";

import { requireAuth } from "@/lib/auth/authorization";
import { createDashboardRepository } from "@/repositories/dashboard.repository";
import type { DashboardOverview } from "@/types/dashboard";

const dashboardRepository = createDashboardRepository();

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  await requireAuth();

  const [summary, warehouseCapacities, lowCapacityAlerts, recentActivity] =
    await Promise.all([
      dashboardRepository.getInventorySummary(),
      dashboardRepository.getWarehouseCapacities(),
      dashboardRepository.getLowCapacityAlerts(),
      dashboardRepository.getRecentActivity(5),
    ]);

  return {
    summary,
    warehouseCapacities,
    lowCapacityAlerts,
    recentActivity,
  };
};
