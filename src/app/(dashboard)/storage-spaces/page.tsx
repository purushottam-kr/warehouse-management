"use client";

import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { useEffect, useState } from "react";

type StorageSpaceStatus = "ACTIVE" | "INACTIVE";

type StorageSpace = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  name: string;
  code: string;
  capacity: string;
  storageType: string;
  status: StorageSpaceStatus;
  createdAt: string;
  updatedAt: string;
};

type StorageSpacesResponse = {
  data: StorageSpace[];
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

const formatStorageType = (value: string) => {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const StorageSpacesPage = () => {
  const [storageSpaces, setStorageSpaces] = useState<
    StorageSpace[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStorageSpaces = async () => {
      try {
        setError("");

        const response = await fetch(
          "/api/storage-spaces",
          {
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as
            | StorageSpacesResponse
            | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error?.message ??
                  "Unable to load storage spaces."
              : "Unable to load storage spaces.",
          );
        }

        if (!("data" in data)) {
          throw new Error(
            "Invalid storage spaces response.",
          );
        }

        setStorageSpaces(data.data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load storage spaces.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadStorageSpaces();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="h-12 animate-pulse bg-neutral-100" />

          <div className="space-y-px">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse bg-white"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950">
            Storage Spaces
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Manage the physical storage locations across
            your warehouses.
          </p>
        </div>

        <Link
          href="/storage-spaces/new"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-neutral-950 px-3.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" />
          New storage space
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

      {storageSpaces.length === 0 ? (
        <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100">
            <Boxes className="h-5 w-5 text-neutral-600" />
          </div>

          <h2 className="mt-4 text-sm font-semibold text-neutral-950">
            No storage spaces
          </h2>

          <p className="mt-1 max-w-sm text-sm text-neutral-500">
            Create a storage space to define where
            inventory can be placed.
          </p>

          <Link
            href="/storage-spaces/new"
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 px-3.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" />
            Create storage space
          </Link>
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-950">
                All storage spaces
              </h2>

              <p className="mt-0.5 text-xs text-neutral-500">
                {storageSpaces.length}{" "}
                {storageSpaces.length === 1
                  ? "storage space"
                  : "storage spaces"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Storage space
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Warehouse
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

                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {storageSpaces.map((storageSpace) => (
                  <tr
                    key={storageSpace.id}
                    className="hover:bg-neutral-50"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-neutral-950">
                          {storageSpace.name}
                        </p>

                        <p className="mt-0.5 font-mono text-xs text-neutral-500">
                          {storageSpace.code}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-neutral-700">
                      {storageSpace.warehouseName}
                    </td>

                    <td className="px-5 py-4 text-sm text-neutral-600">
                      {formatStorageType(
                        storageSpace.storageType,
                      )}
                    </td>

                    <td className="px-5 py-4 text-right font-mono text-sm text-neutral-700">
                      {formatCapacity(
                        storageSpace.capacity,
                      )}
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

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/storage-spaces/${storageSpace.id}`}
                        className="text-sm font-medium text-neutral-700 hover:text-neutral-950"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default StorageSpacesPage;