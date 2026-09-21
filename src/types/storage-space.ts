import type { ListPagination } from "@/types/pagination";

export type StorageSpaceStatus = "ACTIVE" | "INACTIVE";

export type StorageSpace = {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  capacity: string;
  storageType: string;
  status: StorageSpaceStatus;
  createdAt: Date;
  updatedAt: Date;
};

/*
 * Read model for the storage-space list — the parent
 * warehouse name is joined by the repository so the
 * frontend never issues per-row lookups.
 */
export type StorageSpaceListRow = StorageSpace & {
  warehouseName: string;
};

export type CreateStorageSpaceInput = {
  warehouseId: string;
  name: string;
  code: string;
  capacity: string;
  storageType: string;
};

export type UpdateStorageSpaceInput = {
  name?: string;
  code?: string;
  capacity?: string;
  storageType?: string;
  status?: StorageSpaceStatus;
};

export type ListStorageSpacesQuery = {
  page: number;
  pageSize: number;
  search?: string;
  warehouseId?: string;
  storageType?: string;
  status?: StorageSpaceStatus;
};

export type StorageSpaceListPage = {
  storageSpaces: StorageSpaceListRow[];
  pagination: ListPagination;
};