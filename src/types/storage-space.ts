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