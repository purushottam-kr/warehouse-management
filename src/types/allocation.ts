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