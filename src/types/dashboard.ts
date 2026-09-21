import type { MovementActivity } from "@/types/inventory-movement";

export type InventorySummary = {
  totalWarehouses: number;
  activeWarehouses: number;
  totalItems: number;
  itemsWithInventory: number;
  totalStorageSpaces: number;
  activeStorageSpaces: number;
};

export type WarehouseCapacitySummary = {
  id: string;
  name: string;
  code: string;
  allocatedQuantity: string;
  totalCapacity: string;
  capacityPercentage: number;
};

export type LowCapacityAlert = {
  id: string;
  name: string;
  code: string;
  type: "WAREHOUSE" | "STORAGE_SPACE";
  allocatedQuantity: string;
  totalCapacity: string;
  capacityPercentage: number;
};

export type DashboardOverview = {
  summary: InventorySummary;
  warehouseCapacities: WarehouseCapacitySummary[];
  lowCapacityAlerts: LowCapacityAlert[];
  recentActivity: MovementActivity[];
};
