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