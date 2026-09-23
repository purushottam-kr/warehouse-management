export type Allocation = {
  id: string;
  itemId: string;
  storageSpaceId: string;
  quantity: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAllocationInput = {
  itemId: string;
  quantity: string;
  storageSpaceId?: string;
};

export type AllocationResult = {
  itemId: string;
  requestedQuantity: string;
  allocations: Array<{
    storageSpaceId: string;
    quantity: string;
  }>;
};

export type ItemAllocationLocation = {
  storageSpaceId: string;
  storageSpaceName: string;
  storageSpaceCode: string;
  storageType: string;
  warehouseId: string;
  warehouseName: string;
  /*
   * Step 8: full-path segments. Nullable for
   * legacy-shaped rows without a chain below the
   * warehouse — the formatter skips missing levels.
   */
  aisleName: string | null;
  aisleCode: string | null;
  bayName: string | null;
  bayCode: string | null;
  layerName: string | null;
  layerCode: string | null;
  quantity: string;
};

export type ItemAllocationSummary = {
  itemId: string;
  totalQuantity: string;
  locations: ItemAllocationLocation[];
};

export type ReleaseInventoryInput = {
  itemId: string;
  storageSpaceId: string;
  quantity: string;
};

export type ReleaseResult = {
  itemId: string;
  storageSpaceId: string;
  releasedQuantity: string;
};