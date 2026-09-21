import type { ListPagination } from "@/types/pagination";

export type Item = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  requiredStorageType: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateItemInput = {
  sku: string;
  name: string;
  description?: string;
  unit: string;
  requiredStorageType?: string;
};

export type UpdateItemInput = {
  sku?: string;
  name?: string;
  description?: string | null;
  unit?: string;
  requiredStorageType?: string | null;
};

export type ListItemQuery = {
  page: number;
  pageSize: number;
  search?: string;
  warehouseId?: string;
  storageSpaceId?: string;
};

export type ItemListPage = {
  items: Item[];
  pagination: ListPagination;
};