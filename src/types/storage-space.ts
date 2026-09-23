import type { ListPagination } from "@/types/pagination";

export type StorageSpaceStatus = "ACTIVE" | "INACTIVE";

export type StorageSpace = {
  id: string;
  warehouseId: string;
  /*
   * Transition field (Step 5): the canonical parent.
   * Nullable until Step 3-finalize backfills legacy rows
   * and sets the column NOT NULL.
   */
  layerId: string | null;
  name: string;
  code: string;
  capacity: string;
  allocatedQuantity?: string;
  storageType: string;
  status: StorageSpaceStatus;
  createdAt: Date;
  updatedAt: Date;
};

/*
 * Read model for the storage-space list — the parent
 * warehouse name is joined by the repository so the
 * frontend never issues per-row lookups.
 *
 * Step 8: aisle/bay/layer names ride along for the
 * full-path display. Nullable for legacy-shaped rows.
 */
export type StorageSpaceListRow = StorageSpace & {
  warehouseName: string;
  aisleName: string | null;
  bayName: string | null;
  layerName: string | null;
};

export type CreateStorageSpaceInput = {
  /*
   * Transition contract (Step 5): layerId is the
   * canonical parent. warehouseId is still accepted
   * from the nested warehouse route and must match the
   * layer's warehouse — the service derives and stores
   * it (dual-write) until finalize drops the column.
   */
  layerId: string;
  warehouseId?: string;
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
  layerId?: string;
  storageType?: string;
  status?: StorageSpaceStatus;
};

export type StorageSpaceListPage = {
  storageSpaces: StorageSpaceListRow[];
  pagination: ListPagination;
};

/*
 * Step 8: full location path for one storage space,
 * walked up space -> layer -> bay -> aisle ->
 * warehouse. Levels below the warehouse are null for
 * legacy-shaped rows.
 */
export type StorageSpaceLocationPath = {
  spaceId: string;
  spaceName: string;
  spaceCode: string;
  layerId: string | null;
  layerName: string | null;
  layerCode: string | null;
  bayId: string | null;
  bayName: string | null;
  bayCode: string | null;
  aisleId: string | null;
  aisleName: string | null;
  aisleCode: string | null;
  warehouseId: string;
  warehouseName: string;
};