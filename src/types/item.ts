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