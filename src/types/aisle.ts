export type AisleStatus = "ACTIVE" | "INACTIVE";

export type Aisle = {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  status: AisleStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAisleInput = {
  warehouseId: string;
  name: string;
  code: string;
};

export type UpdateAisleInput = {
  name?: string;
  code?: string;
  status?: AisleStatus;
};
