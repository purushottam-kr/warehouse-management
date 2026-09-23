import {
  and,
  asc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  aisles,
  allocations,
  bays,
  layers,
  storageSpaces,
  warehouses,
} from "@/db/schema";
import type {
  CreateStorageSpaceInput,
  StorageSpaceListRow,
  StorageSpaceLocationPath,
  StorageSpaceStatus,
  UpdateStorageSpaceInput,
} from "@/types/storage-space";

type StorageSpaceFilters = {
  search?: string;
  warehouseId?: string;
  layerId?: string;
  storageType?: string;
  status?: StorageSpaceStatus;
};

const buildStorageSpaceFilters = (
  filters: StorageSpaceFilters,
): SQL | undefined => {
  const conditions: SQL[] = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(storageSpaces.code, `%${filters.search}%`),
        ilike(storageSpaces.name, `%${filters.search}%`),
      ) as SQL,
    );
  }

  if (filters.warehouseId) {
    conditions.push(
      eq(storageSpaces.warehouseId, filters.warehouseId),
    );
  }

  if (filters.layerId) {
    conditions.push(
      eq(storageSpaces.layerId, filters.layerId),
    );
  }

  if (filters.storageType) {
    conditions.push(
      ilike(
        storageSpaces.storageType,
        `%${filters.storageType}%`,
      ),
    );
  }

  if (filters.status) {
    conditions.push(
      eq(storageSpaces.status, filters.status),
    );
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return and(...conditions);
};

export const createStorageSpaceRepository = () => {
  /*
   * The service always resolves warehouseId from the
   * layer chain (dual-write) before calling create, so
   * the repository requires the resolved value here.
   */
  const create = async (
    data: CreateStorageSpaceInput & {
      warehouseId: string;
    },
  ) => {
    const [storageSpace] = await db
      .insert(storageSpaces)
      .values({
        warehouseId: data.warehouseId,
        layerId: data.layerId,
        name: data.name,
        code: data.code,
        capacity: data.capacity,
        storageType: data.storageType,
      })
      .returning();

    return storageSpace;
  };

  const findById = async (id: string) => {
    const [storageSpace] = await db
      .select()
      .from(storageSpaces)
      .where(eq(storageSpaces.id, id))
      .limit(1);

    return storageSpace ?? null;
  };

  const findByCode = async (
    warehouseId: string,
    code: string,
  ) => {
    const [storageSpace] = await db
      .select()
      .from(storageSpaces)
      .where(
        and(
          eq(storageSpaces.warehouseId, warehouseId),
          eq(storageSpaces.code, code),
        ),
      )
      .limit(1);

    return storageSpace ?? null;
  };

  /*
   * Layer-scoped code lookup for the new creation
   * contract (Step 5). Uniqueness is enforced in the
   * service; the (layer_id, code) DB constraint arrives
   * at finalize.
   */
  const findByCodeInLayer = async (
    layerId: string,
    code: string,
  ) => {
    const [storageSpace] = await db
      .select()
      .from(storageSpaces)
      .where(
        and(
          eq(storageSpaces.layerId, layerId),
          eq(storageSpaces.code, code),
        ),
      )
      .limit(1);

    return storageSpace ?? null;
  };

  const findManyByWarehouseId = async (
    warehouseId: string,
  ) => {
    return db
      .select()
      .from(storageSpaces)
      .where(eq(storageSpaces.warehouseId, warehouseId))
      .orderBy(asc(storageSpaces.name));
  };

  /*
   * Additive finder for the physical-hierarchy
   * deletion guards (Step 3): walk down
   * Bay -> Layer -> Storage Space. No existing
   * query is changed.
   */
  const findManyByLayerId = async (
    layerId: string,
  ) => {
    return db
      .select()
      .from(storageSpaces)
      .where(eq(storageSpaces.layerId, layerId))
      .orderBy(asc(storageSpaces.name));
  };

  /*
   * Step 8: aisle/bay/layer names ride along for the
   * full-path display (LEFT JOINs — null for legacy
   * rows). The warehouse join stays on the stored
   * column, still dual-written and identical.
   */
  const findMany = async (): Promise<StorageSpaceListRow[]> => {
  return db
    .select({
      id: storageSpaces.id,
      warehouseId: storageSpaces.warehouseId,
      layerId: storageSpaces.layerId,
      warehouseName: warehouses.name,
      aisleName: aisles.name,
      bayName: bays.name,
      layerName: layers.name,
      name: storageSpaces.name,
      code: storageSpaces.code,
      capacity: storageSpaces.capacity,
      allocatedQuantity: sql<string>`COALESCE((
        SELECT SUM(${allocations.quantity})
        FROM ${allocations}
        WHERE ${allocations.storageSpaceId} = ${storageSpaces.id}
      ), 0)`,
      storageType: storageSpaces.storageType,
      status: storageSpaces.status,
      createdAt: storageSpaces.createdAt,
      updatedAt: storageSpaces.updatedAt,
    })
    .from(storageSpaces)
    .innerJoin(
      warehouses,
      eq(storageSpaces.warehouseId, warehouses.id),
    )
    .leftJoin(
      layers,
      eq(storageSpaces.layerId, layers.id),
    )
    .leftJoin(bays, eq(layers.bayId, bays.id))
    .leftJoin(aisles, eq(bays.aisleId, aisles.id))
    .orderBy(asc(storageSpaces.name));
};

  /*
   * Total matching storage spaces for pagination.
   *
   * No joins are needed: every filter references the
   * storage_spaces table only.
   */
  const countStorageSpaces = async (
    filters: StorageSpaceFilters,
  ): Promise<number> => {
    const [result] = await db
      .select({
        total: sql<string>`count(*)`,
      })
      .from(storageSpaces)
      .where(buildStorageSpaceFilters(filters));

    return Number(result.total);
  };

  const findStorageSpaces = async (
    filters: StorageSpaceFilters,
    limit: number,
    offset: number,
  ): Promise<StorageSpaceListRow[]> => {
    return db
      .select({
        id: storageSpaces.id,
        warehouseId: storageSpaces.warehouseId,
        layerId: storageSpaces.layerId,
        warehouseName: warehouses.name,
        aisleName: aisles.name,
        bayName: bays.name,
        layerName: layers.name,
        name: storageSpaces.name,
        code: storageSpaces.code,
        capacity: storageSpaces.capacity,
        storageType: storageSpaces.storageType,
        status: storageSpaces.status,
        createdAt: storageSpaces.createdAt,
        updatedAt: storageSpaces.updatedAt,
      })
      .from(storageSpaces)
      .innerJoin(
        warehouses,
        eq(storageSpaces.warehouseId, warehouses.id),
      )
      .leftJoin(
        layers,
        eq(storageSpaces.layerId, layers.id),
      )
      .leftJoin(bays, eq(layers.bayId, bays.id))
      .leftJoin(aisles, eq(bays.aisleId, aisles.id))
      .where(buildStorageSpaceFilters(filters))
      /*
       * Secondary ID ordering keeps pagination stable
       * when timestamps are identical.
       */
      .orderBy(
        asc(storageSpaces.name),
        asc(storageSpaces.id),
      )
      .limit(limit)
      .offset(offset);
  };

  /*
   * Step 8: full location path for one storage space,
   * walked up space -> layer -> bay -> aisle ->
   * warehouse. Chain levels are null for legacy-shaped
   * rows; the warehouse always resolves via the stored
   * column.
   */
  const getLocationPath = async (
    id: string,
  ): Promise<StorageSpaceLocationPath | null> => {
    const [row] = await db
      .select({
        spaceId: storageSpaces.id,
        spaceName: storageSpaces.name,
        spaceCode: storageSpaces.code,
        layerId: storageSpaces.layerId,
        layerName: layers.name,
        layerCode: layers.code,
        bayId: bays.id,
        bayName: bays.name,
        bayCode: bays.code,
        aisleId: aisles.id,
        aisleName: aisles.name,
        aisleCode: aisles.code,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
      })
      .from(storageSpaces)
      .innerJoin(
        warehouses,
        eq(storageSpaces.warehouseId, warehouses.id),
      )
      .leftJoin(
        layers,
        eq(storageSpaces.layerId, layers.id),
      )
      .leftJoin(bays, eq(layers.bayId, bays.id))
      .leftJoin(aisles, eq(bays.aisleId, aisles.id))
      .where(eq(storageSpaces.id, id))
      .limit(1);

    return row ?? null;
  };

  const update = async (
    id: string,
    data: UpdateStorageSpaceInput,
  ) => {
    const [storageSpace] = await db
      .update(storageSpaces)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(storageSpaces.id, id))
      .returning();

    return storageSpace ?? null;
  };

  const remove = async (id: string) => {
    const [storageSpace] = await db
      .delete(storageSpaces)
      .where(eq(storageSpaces.id, id))
      .returning();

    return storageSpace ?? null;
  };

  return {
    create,
    findById,
    findByCode,
    findByCodeInLayer,
    findManyByWarehouseId,
    findManyByLayerId,
    findMany,
    getLocationPath,
    countStorageSpaces,
    findStorageSpaces,
    update,
    remove,
  };
};