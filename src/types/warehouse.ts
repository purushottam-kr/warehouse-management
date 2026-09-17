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