export type InventoryMovementType =
  | "ALLOCATE"
  | "MOVE"
  | "RELEASE";

export type CreateInventoryMovementInput = {
  itemId: string;
  type: InventoryMovementType;
  quantity: string;
  fromStorageSpaceId?: string | null;
  toStorageSpaceId?: string | null;
  createdBy: string;
};