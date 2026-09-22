"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type StorageSpaceStatus = "ACTIVE" | "INACTIVE";

type StorageSpace = {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  capacity: string;
  storageType: string;
  status: StorageSpaceStatus;
  createdAt: string;
  updatedAt: string;
};

type InventoryRow = {
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  quantity: string;
};

type ApiResponse = {
  data: StorageSpace;
};

type InventoryResponse = {
  data: InventoryRow[];
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

type UserResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: "ADMIN" | "STAFF";
  };
};

const formatCapacity = (value: string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatStorageType = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const StorageSpaceDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [storageSpace, setStorageSpace] = useState<StorageSpace | null>(null);
  const [warehouseName, setWarehouseName] = useState("");
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStorageSpace = async () => {
      try {
        setError("");

        const [
          storageResponse,
          warehouseResponse,
          userResponse,
          inventoryResponse,
        ] =
          await Promise.all([
            fetch(`/api/storage-spaces/${params.id}`, {
              cache: "no-store",
            }),
            fetch("/api/warehouses", {
              cache: "no-store",
            }),
            fetch("/api/auth/me", {
              cache: "no-store",
            }),
            fetch(`/api/storage-spaces/${params.id}/inventory`, {
              cache: "no-store",
            }),
          ]);

        const storageData =
          (await storageResponse.json()) as
            | ApiResponse
            | ApiErrorResponse;

        const warehouseData = (await warehouseResponse.json()) as
          | {
              data: Array<{
                id: string;
                name: string;
              }>;
            }
          | ApiErrorResponse;

        const userData =
          (await userResponse.json()) as UserResponse | ApiErrorResponse;

        const inventoryData =
          (await inventoryResponse.json()) as
            | InventoryResponse
            | ApiErrorResponse;

        if (!storageResponse.ok) {
          throw new Error(
            "error" in storageData
              ? storageData.error?.message ?? "Unable to load storage space."
              : "Unable to load storage space.",
          );
        }

        if (!warehouseResponse.ok) {
          throw new Error("Unable to load warehouse information.");
        }

        if (!userResponse.ok) {
          throw new Error("Unable to load user information.");
        }

        if (!inventoryResponse.ok) {
          throw new Error(
            "error" in inventoryData
              ? inventoryData.error?.message ??
                  "Unable to load inventory."
              : "Unable to load inventory.",
          );
        }

        if (
          !("data" in storageData) ||
          !("data" in warehouseData) ||
          !("user" in userData) ||
          !("data" in inventoryData)
        ) {
          throw new Error("Invalid storage space response.");
        }

        const warehouse = warehouseData.data.find(
          (item) => item.id === storageData.data.warehouseId,
        );

        setStorageSpace(storageData.data);
        setWarehouseName(warehouse?.name ?? "Unknown warehouse");
        setIsAdmin(userData.user.role === "ADMIN");
        setInventory(inventoryData.data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load storage space.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadStorageSpace();
  }, [params.id]);

  const handleDelete = async () => {
    if (!storageSpace || !isAdmin) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${storageSpace.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/storage-spaces/${storageSpace.id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as
        | ApiResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ?? "Unable to delete storage space."
            : "Unable to delete storage space.",
        );
      }

      router.push("/storage-spaces");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete storage space.",
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-8 w-72 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />

        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!storageSpace) {
    return (
      <div className="space-y-4">
        <Link
          href="/storage-spaces"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to storage spaces
        </Link>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
          <h1 className="text-lg font-semibold text-neutral-950 dark:text-neutral-100">
            Storage space not found
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 ">
            The storage space may have been deleted or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const filledCapacity = inventory.reduce(
    (total, row) => total + Number(row.quantity),
    0,
  );
  const remainingCapacity = Math.max(
    0,
    Number(storageSpace.capacity) - filledCapacity,
  );
  const capacityPercentage =
    Number(storageSpace.capacity) > 0
      ? Math.min(
          100,
          (filledCapacity / Number(storageSpace.capacity)) * 100,
        )
      : 0;

  return (
    <div className="space-y-6">
      <Link
        href="/storage-spaces"
        className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 transition-colors hover:text-neutral-950 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to storage spaces
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
              {storageSpace.name}
            </h1>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                storageSpace.status === "ACTIVE"
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {storageSpace.status}
            </span>
          </div>

          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 ">
            {warehouseName} · {storageSpace.code}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/storage-spaces/${storageSpace.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 "
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>

          {isAdmin && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 dark:border-red-900 bg-white dark:bg-neutral-900 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300 ">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">
            Storage space details
          </h2>
        </div>

        <div className="grid gap-px bg-neutral-200 dark:bg-neutral-700 md:grid-cols-2">
          <div className="bg-white dark:bg-neutral-900 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
              Warehouse
            </p>
            <p className="mt-1 text-sm font-medium text-neutral-950 dark:text-neutral-100">
              {warehouseName}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
              Storage type
            </p>
            <p className="mt-1 text-sm font-medium text-neutral-950 dark:text-neutral-100">
              {formatStorageType(storageSpace.storageType)}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
              Capacity
            </p>
            <p className="mt-1 text-sm font-medium text-neutral-950 dark:text-neutral-100">
              {formatCapacity(storageSpace.capacity)}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
                Capacity usage
              </p>
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {capacityPercentage.toFixed(1)}% filled
              </p>
            </div>

            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
              role="progressbar"
              aria-label="Storage capacity used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={capacityPercentage}
            >
              <div
                className="h-full rounded-full bg-sky-500 transition-[width]"
                style={{ width: `${capacityPercentage}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
              <span>
                {formatCapacity(filledCapacity.toString())} filled
              </span>
              <span>
                {formatCapacity(remainingCapacity.toString())} remaining
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
              Status
            </p>
            <p className="mt-1 text-sm font-medium text-neutral-950 dark:text-neutral-100">
              {storageSpace.status}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
              Created
            </p>
            <p className="mt-1 text-sm font-medium text-neutral-950 dark:text-neutral-100">
              {formatDate(storageSpace.createdAt)}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
              Last updated
            </p>
            <p className="mt-1 text-sm font-medium text-neutral-950 dark:text-neutral-100">
              {formatDate(storageSpace.updatedAt)}
            </p>
          </div>

          <div
            aria-hidden="true"
            className="hidden bg-white dark:bg-neutral-900 md:block"
          />
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">Inventory</h2>
        </div>

        {inventory.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              No inventory stored in this space.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {inventory.map((row) => (
              <div
                key={row.itemId}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-950 dark:text-neutral-100">
                    {row.itemName}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {row.sku}
                  </p>
                </div>
                <p className="font-mono text-sm text-neutral-950 dark:text-neutral-100">
                  {formatCapacity(row.quantity)} {row.unit}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StorageSpaceDetailPage;