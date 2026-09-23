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

/*
 * Read model for the activity view.
 *
 * Assembled by the repository through joins — the
 * frontend never issues per-row lookups.
 */
export type MovementActor = {
  id: string;
  name: string | null;
  email: string;
};

export type MovementSpaceRef = {
  id: string;
  name: string;
  code: string;
  warehouseName: string;
  /*
   * Step 8: full-path segments, nullable for
   * legacy-shaped rows.
   */
  aisleName: string | null;
  bayName: string | null;
  layerName: string | null;
};

export type MovementActivity = {
  id: string;
  type: InventoryMovementType;
  quantity: string;
  createdAt: Date;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
  from: MovementSpaceRef | null;
  to: MovementSpaceRef | null;
  performedBy: MovementActor;
};

export type ListMovementsQuery = {
  page: number;
  pageSize: number;
  itemId?: string;
  type?: InventoryMovementType;
  warehouseId?: string;
  search?: string;
};

export type MovementPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type MovementActivityPage = {
  movements: MovementActivity[];
  pagination: MovementPagination;
};