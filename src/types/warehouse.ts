import type { ListPagination } from "@/types/pagination";

export type WarehouseStatus = "ACTIVE" | "INACTIVE";

export type Warehouse = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  status: WarehouseStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateWarehouseInput = {
  name: string;
  code: string;
  address?: string;
};

export type UpdateWarehouseInput = {
  name?: string;
  code?: string;
  address?: string | null;
  status?: WarehouseStatus;
};

export type ListWarehousesQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: WarehouseStatus;
};

/*
 * Read model for the warehouse list.
 *
 * Capacity figures are correlated aggregates assembled
 * by the repository — the frontend never sums rows
 * itself:
 *
 * - totalCapacity: sum of the warehouse's storage-space
 *   capacities
 * - allocatedQuantity: sum of allocation quantities
 *   across those spaces
 */
export type WarehouseCapacitySummary = {
  totalCapacity: string;
  allocatedQuantity: string;
};

export type WarehouseListRow = Warehouse &
  WarehouseCapacitySummary;

export type WarehouseListPage = {
  warehouses: WarehouseListRow[];
  pagination: ListPagination;
};