"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Warehouse } from "@/types/warehouse";
import type { StorageSpace } from "@/types/storage-space";

type UserRole = "ADMIN" | "STAFF";

type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

type WarehouseResponse = {
  data: Warehouse;
};

type StorageSpacesResponse = {
  data: StorageSpace[];
};

type UserResponse = {
  user: CurrentUser;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

const formatCapacity = (value: string) => {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
};

const WarehouseDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [warehouse, setWarehouse] = useState<Warehouse | null>(
    null,
  );

  const [storageSpaces, setStorageSpaces] = useState<
    StorageSpace[]
  >([]);

  const [user, setUser] = useState<CurrentUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const warehouseId = params.id;

  useEffect(() => {
    const loadWarehouse = async () => {
      try {
        setError("");

        const [
          warehouseResponse,
          storageResponse,
          userResponse,
        ] = await Promise.all([
          fetch(`/api/warehouses/${warehouseId}`, {
            cache: "no-store",
          }),
          fetch(
            `/api/warehouses/${warehouseId}/storage-spaces`,
            {
              cache: "no-store",
            },
          ),
          fetch("/api/auth/me", {
            cache: "no-store",
          }),
        ]);

        const warehouseData =
          (await warehouseResponse.json()) as
            | WarehouseResponse
            | ApiErrorResponse;

        const storageData =
          (await storageResponse.json()) as
            | StorageSpacesResponse
            | ApiErrorResponse;

        const userData =
          (await userResponse.json()) as
            | UserResponse
            | ApiErrorResponse;

        if (!warehouseResponse.ok) {
          throw new Error(
            "error" in warehouseData
              ? warehouseData.error?.message ??
                  "Unable to load warehouse."
              : "Unable to load warehouse.",
          );
        }

        if (!storageResponse.ok) {
          throw new Error(
            "error" in storageData
              ? storageData.error?.message ??
                  "Unable to load storage spaces."
              : "Unable to load storage spaces.",
          );
        }

        if (!userResponse.ok) {
          throw new Error(
            "error" in userData
              ? userData.error?.message ??
                  "Unable to load current user."
              : "Unable to load current user.",
          );
        }

        if (
          !("data" in warehouseData) ||
          !("data" in storageData) ||
          !("user" in userData)
        ) {
          throw new Error(
            "Invalid warehouse response.",
          );
        }

        setWarehouse(warehouseData.data);
        setStorageSpaces(storageData.data);
        setUser(userData.user);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load warehouse.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadWarehouse();
  }, [warehouseId]);

  const handleDelete = async () => {
    if (!warehouse || user?.role !== "ADMIN") {
      return;
    }

    const confirmed = window.confirm(
      `Delete warehouse "${warehouse.name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/warehouses/${warehouse.id}`,
        {
          method: "DELETE",
        },
      );

      const data =
        (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        setError(
          data.error?.message ??
            "Unable to delete warehouse.",
        );
        return;
      }

      router.push("/warehouses");
      router.refresh();
    } catch {
      setError("Unable to delete warehouse.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />

        <div className="h-28 animate-pulse rounded-xl bg-white" />

        <div className="h-64 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (error && !warehouse) {
    return (
      <div className="space-y-4">
        <Link
          href="/warehouses"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Warehouses
        </Link>

        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return null;
  }

  const totalCapacity = storageSpaces.reduce(
    (total, storageSpace) =>
      total + Number(storageSpace.capacity),
    0,
  );

  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/warehouses"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Warehouses
        </Link>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-start justify-between gap-6 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
              <WarehouseIcon className="h-5 w-5 text-neutral-600" />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight text-neutral-950">
                  {warehouse.name}
                </h1>

                <span
                  className={
                    warehouse.status === "ACTIVE"
                      ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                      : "inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600"
                  }
                >
                  {warehouse.status === "ACTIVE"
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>

              <p className="mt-1 font-mono text-sm text-neutral-500">
                {warehouse.code}
              </p>

              {warehouse.address ? (
                <p className="mt-3 text-sm text-neutral-600">
                  {warehouse.address}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/warehouses/${warehouse.id}/edit`}
              className="inline-flex h-9 items-center rounded-lg border border-neutral-300 px-3.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Edit
            </Link>

            {isAdmin ? (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex h-9 items-center rounded-lg border border-red-200 px-3.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">
            Total capacity
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {formatCapacity(String(totalCapacity))}
          </p>

          <p className="mt-1 text-xs text-neutral-400">
            Sum of all storage-space capacities
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">
            Storage spaces
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {storageSpaces.length}
          </p>

          <p className="mt-1 text-xs text-neutral-400">
            Configured storage locations
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-950">
              Storage spaces
            </h2>

            <p className="mt-0.5 text-xs text-neutral-500">
              Storage locations within this warehouse.
            </p>
          </div>

          <Link
            href={`/warehouses/${warehouse.id}/storage-spaces/new`}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 px-3.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" />
            Add space
          </Link>
        </div>

        {storageSpaces.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
            <h3 className="text-sm font-medium text-neutral-950">
              No storage spaces
            </h3>

            <p className="mt-1 text-sm text-neutral-500">
              Add a storage space to define where inventory
              can be placed.
            </p>

            <Link
              href={`/warehouses/${warehouse.id}/storage-spaces/new`}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-300 px-3.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Plus className="h-4 w-4" />
              Add storage space
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Name
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Code
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Storage type
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Capacity
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {storageSpaces.map((storageSpace) => (
                  <tr
                    key={storageSpace.id}
                    className="hover:bg-neutral-50"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-neutral-950">
                      {storageSpace.name}
                    </td>

                    <td className="px-5 py-4 font-mono text-sm text-neutral-600">
                      {storageSpace.code}
                    </td>

                    <td className="px-5 py-4 text-sm text-neutral-600">
                      {storageSpace.storageType}
                    </td>

                    <td className="px-5 py-4 text-right font-mono text-sm text-neutral-700">
                      {formatCapacity(storageSpace.capacity)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          storageSpace.status === "ACTIVE"
                            ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                            : "inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600"
                        }
                      >
                        {storageSpace.status === "ACTIVE"
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default WarehouseDetailPage;