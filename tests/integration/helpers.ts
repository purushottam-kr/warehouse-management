import dotenv from "dotenv";

import { Pool, type QueryResultRow } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export const BASE_URL =
  process.env.TEST_BASE_URL ?? "http://localhost:3000";

export const RUN_ID = Math.random()
  .toString(16)
  .slice(2, 10)
  .toUpperCase();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const closePool = async (): Promise<void> => {
  await pool.end();
};

type ApiResult<T> = {
  status: number;
  body: T;
};

let sessionCookie: string | null = null;

export const request = async <T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> => {
  const response = await fetch(
    `${BASE_URL}${path}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(sessionCookie
          ? { Cookie: sessionCookie }
          : {}),
      },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    },
  );

  const text = await response.text();

  const parsed = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    body: parsed as T,
  };
};

export const captureSession = (
  response: Response,
): void => {
  const cookies = response.headers.getSetCookie();

  const session = cookies.find((cookie) =>
    cookie.startsWith("warehouse_session="),
  );

  if (session) {
    sessionCookie = session.split(";")[0]!;
  }
};

export type TestUser = {
  id: string;
  email: string;
};

export const seedUser = async (
  key?: string,
): Promise<TestUser> => {
  const email = `staff-${RUN_ID.toLowerCase()}${
    key ? `-${key}` : ""
  }@test.local`;

  await request("POST", "/api/auth/register", {
    email,
    password: "password123",
    name: "Allocation Integration Tests",
  });

  const loginResponse = await fetch(
    `${BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password: "password123",
      }),
    },
  );

  if (loginResponse.status !== 200) {
    throw new Error(
      `Test login failed: ${loginResponse.status}`,
    );
  }

  captureSession(loginResponse);

  const { user } = (await loginResponse.json()) as {
    user: TestUser;
  };

  return user;
};

export type TestWarehouse = {
  id: string;
  status: string;
};

export const seedWarehouse = async (
  key: string,
): Promise<TestWarehouse> => {
  const { status, body } =
    await request<{ data: TestWarehouse }>(
      "POST",
      "/api/warehouses",
      {
        name: `Warehouse ${key}`,
        code: `WH-${RUN_ID}-${key}`,
        address: "Integration Test Street 1",
      },
    );

  if (status !== 201) {
    throw new Error(
      `Warehouse creation failed: ${status} ${JSON.stringify(body)}`,
    );
  }

  createdWarehouseIds.push(body.data.id);

  return body.data;
};

export type TestStorageSpace = {
  id: string;
  capacity: string;
};

export const seedStorageSpace = async (
  warehouseId: string,
  key: string,
  capacity: string,
  storageType: string,
): Promise<TestStorageSpace> => {
  const { status, body } =
    await request<{ data: TestStorageSpace }>(
      "POST",
      `/api/warehouses/${warehouseId}/storage-spaces`,
      {
        warehouseId,
        name: `Space ${key}`,
        code: `SP-${RUN_ID}-${key}`,
        capacity,
        storageType,
      },
    );

  if (status !== 201) {
    throw new Error(
      `Storage space creation failed: ${status} ${JSON.stringify(body)}`,
    );
  }

  createdStorageSpaceIds.push(body.data.id);

  return body.data;
};

export const setWarehouseStatus = async (
  warehouseId: string,
  status: "ACTIVE" | "INACTIVE",
): Promise<void> => {
  const { status: httpStatus } = await request(
    "PATCH",
    `/api/warehouses/${warehouseId}`,
    { status },
  );

  if (httpStatus !== 200) {
    throw new Error(
      `Warehouse update failed: ${httpStatus}`,
    );
  }
};

export const setStorageSpaceStatus = async (
  storageSpaceId: string,
  status: "ACTIVE" | "INACTIVE",
): Promise<void> => {
  const { status: httpStatus } = await request(
    "PATCH",
    `/api/storage-spaces/${storageSpaceId}`,
    { status },
  );

  if (httpStatus !== 200) {
    throw new Error(
      `Storage space update failed: ${httpStatus}`,
    );
  }
};

export type TestItem = {
  id: string;
  sku: string;
  requiredStorageType: string | null;
};

export const seedItem = async (
  key: string,
  requiredStorageType: string | null,
): Promise<TestItem> => {
  const { status, body } = await request<{
    data: TestItem;
  }>("POST", "/api/items", {
    sku: `SKU-${RUN_ID}-${key}`,
    name: `Item ${key}`,
    unit: "UNIT",
    ...(requiredStorageType === null
      ? {}
      : { requiredStorageType }),
  });

  if (status !== 201) {
    throw new Error(
      `Item creation failed: ${status} ${JSON.stringify(body)}`,
    );
  }

  createdItemIds.push(body.data.id);

  return body.data;
};

export type AllocationResponseBody = {
  itemId: string;
  requestedQuantity: string;
  allocations: Array<{
    storageSpaceId: string;
    quantity: string;
  }>;
};

export type AllocationErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export const allocate = async (
  itemId: string,
  quantity: string,
): Promise<ApiResult<AllocationResponseBody | AllocationErrorBody>> => {
  return request("POST", "/api/allocations", {
    itemId,
    quantity,
  });
};

export type AllocationRow = {
  storage_space_id: string;
  quantity: string;
};

export const getAllocationsForItem = async (
  itemId: string,
): Promise<AllocationRow[]> => {
  const result = await pool.query<QueryResultRow>(
    "SELECT storage_space_id, quantity FROM allocations WHERE item_id = $1",
    [itemId],
  );

  return result.rows as AllocationRow[];
};

export type TransferResponseBody = {
  itemId: string;
  fromStorageSpaceId: string;
  toStorageSpaceId: string;
  quantity: string;
};

export type TransferErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export const transfer = async (
  itemId: string,
  fromStorageSpaceId: string,
  toStorageSpaceId: string,
  quantity: string,
): Promise<ApiResult<
  TransferResponseBody | TransferErrorBody
>> => {
  return request("POST", "/api/transfers", {
    itemId,
    fromStorageSpaceId,
    toStorageSpaceId,
    quantity,
  });
};

export type ReleaseResponseBody = {
  data: {
    itemId: string;
    storageSpaceId: string;
    releasedQuantity: string;
  };
};

export type ReleaseErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export const release = async (
  itemId: string,
  storageSpaceId: string,
  quantity: string,
): Promise<ApiResult<
  ReleaseResponseBody | ReleaseErrorBody
>> => {
  return request("POST", "/api/releases", {
    itemId,
    storageSpaceId,
    quantity,
  });
};

export const seedAllocation = async (
  itemId: string,
  storageSpaceId: string,
  quantity: string,
): Promise<void> => {
  await pool.query(
    "INSERT INTO allocations (item_id, storage_space_id, quantity) VALUES ($1, $2, $3)",
    [itemId, storageSpaceId, quantity],
  );
};

export type MovementRow = {
  type: string;
  quantity: string;
  from_storage_space_id: string | null;
  to_storage_space_id: string | null;
  created_by: string;
};

export const getMovementsForItem = async (
  itemId: string,
): Promise<MovementRow[]> => {
  const result = await pool.query<QueryResultRow>(
    "SELECT type, quantity, from_storage_space_id, to_storage_space_id, created_by FROM inventory_movements WHERE item_id = $1",
    [itemId],
  );

  return result.rows as MovementRow[];
};

const createdWarehouseIds: string[] = [];

const createdStorageSpaceIds: string[] = [];

const createdItemIds: string[] = [];

const createdUserIds: string[] = [];

export const trackUser = (userId: string): void => {
  createdUserIds.push(userId);
};

export const cleanup = async (): Promise<void> => {
  if (
    createdWarehouseIds.length === 0 &&
    createdItemIds.length === 0 &&
    createdUserIds.length === 0
  ) {
    return;
  }

  const spaceIds = createdStorageSpaceIds;
  const itemIds = createdItemIds;
  const warehouseIds = createdWarehouseIds;
  const userIds = createdUserIds;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (spaceIds.length > 0) {
      await client.query(
        "DELETE FROM inventory_movements WHERE to_storage_space_id = ANY($1::uuid[])",
        [spaceIds],
      );
    }

    if (itemIds.length > 0) {
      await client.query(
        "DELETE FROM inventory_movements WHERE item_id = ANY($1::uuid[])",
        [itemIds],
      );
    }

    if (spaceIds.length > 0 || itemIds.length > 0) {
      await client.query(
        "DELETE FROM allocations WHERE storage_space_id = ANY($1::uuid[]) OR item_id = ANY($2::uuid[])",
        [spaceIds, itemIds],
      );
    }

    if (spaceIds.length > 0) {
      await client.query(
        "DELETE FROM storage_spaces WHERE id = ANY($1::uuid[])",
        [spaceIds],
      );
    }

    if (itemIds.length > 0) {
      await client.query(
        "DELETE FROM items WHERE id = ANY($1::uuid[])",
        [itemIds],
      );
    }

    if (warehouseIds.length > 0) {
      await client.query(
        "DELETE FROM warehouses WHERE id = ANY($1::uuid[])",
        [warehouseIds],
      );
    }

    if (userIds.length > 0) {
      await client.query(
        "DELETE FROM sessions WHERE user_id = ANY($1::uuid[])",
        [userIds],
      );

      await client.query(
        "DELETE FROM users WHERE id = ANY($1::uuid[])",
        [userIds],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
};
