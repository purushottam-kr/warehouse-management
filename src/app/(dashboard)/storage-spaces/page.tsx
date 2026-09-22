"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { ListPagination } from "@/types/pagination";
import type {
  StorageSpaceListRow,
  StorageSpaceStatus,
} from "@/types/storage-space";

type StorageSpacesResponse = {
  data: StorageSpaceListRow[];
  pagination: ListPagination;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type WarehouseOption = {
  id: string;
  name: string;
  code: string;
};

const PAGE_SIZE = 25;

const formatCapacity = (value: string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatStorageType = (value: string) => {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const STATUS_BADGE_CLASS: Record<
  StorageSpaceStatus,
  string
> = {
  ACTIVE:
    "inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 ",
  INACTIVE:
    "inline-flex rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 ",
};

const StorageSpacesPage = () => {
  const [searchInput, setSearchInput] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [storageType, setStorageType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [warehouseOptions, setWarehouseOptions] =
    useState<WarehouseOption[]>([]);

  const [storageSpaces, setStorageSpaces] = useState<
    StorageSpaceListRow[]
  >([]);
  const [pagination, setPagination] =
    useState<ListPagination | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const hasFilters =
    searchInput.trim() !== "" ||
    warehouseId !== "" ||
    storageType.trim() !== "" ||
    status !== "";

  useEffect(() => {
    const loadWarehouseOptions = async () => {
      try {
        /*
         * No query parameters: the endpoint returns the
         * full unpaged list for option dropdowns.
         */
        const response = await fetch(
          "/api/warehouses",
          { cache: "no-store" },
        );

        const data = (await response.json()) as
          | { data: WarehouseOption[] }
          | ApiErrorResponse;

        if (response.ok && "data" in data) {
          setWarehouseOptions(data.data);
        }
      } catch {
        // Option lists are best-effort; the storage
        // space query surfaces its own errors.
      }
    };

    void loadWarehouseOptions();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadStorageSpaces = async () => {
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));

        const trimmedSearch = searchInput.trim();
        const trimmedStorageType =
          storageType.trim();

        if (trimmedSearch) {
          params.set("search", trimmedSearch);
        }

        if (warehouseId) {
          params.set("warehouseId", warehouseId);
        }

        if (trimmedStorageType) {
          params.set("storageType", trimmedStorageType);
        }

        if (status) {
          params.set("status", status);
        }

        const response = await fetch(
          `/api/storage-spaces?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = (await response.json()) as
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
        setPagination(data.pagination);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load storage spaces.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(
      () => void loadStorageSpaces(),
      searchInput || storageType ? 300 : 0,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    searchInput,
    warehouseId,
    storageType,
    status,
    page,
  ]);

  const changeFilter = (apply: () => void) => {
    setPage(1);
    apply();
  };

  const start =
    pagination && pagination.total > 0
      ? (pagination.page - 1) *
          pagination.pageSize +
        1
      : 0;

  const end = pagination
    ? Math.min(
        pagination.page * pagination.pageSize,
        pagination.total,
      )
    : 0;

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden space-y-4">
      <div className="shrink-0 space-y-4 pb-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
              Storage Spaces
            </h1>

            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Manage the physical storage locations across
              your warehouses.
            </p>
          </div>

          <Link
            href="/storage-spaces/new"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-neutral-950 dark:bg-neutral-100 px-4 text-sm font-medium text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            New storage space
          </Link>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300 "
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />

            <input
              type="search"
              value={searchInput}
              onChange={(event) =>
                changeFilter(() =>
                  setSearchInput(event.target.value),
                )
              }
              placeholder="Search by code or name"
              aria-label="Search storage spaces"
              className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 text-sm text-neutral-950 dark:text-neutral-100 outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300"
            />
          </div>

          <select
            value={warehouseId}
            onChange={(event) =>
              changeFilter(() =>
                setWarehouseId(event.target.value),
              )
            }
            aria-label="Filter by warehouse"
            className="h-10 max-w-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300"
          >
            <option value="">All warehouses</option>

            {warehouseOptions.map((option) => (
              <option
                key={option.id}
                value={option.id}
              >
                {option.name} ({option.code})
              </option>
            ))}
          </select>

          <input
            type="text"
            value={storageType}
            onChange={(event) =>
              changeFilter(() =>
                setStorageType(event.target.value),
              )
            }
            placeholder="Storage type"
            aria-label="Filter by storage type"
            maxLength={50}
            className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-950 dark:text-neutral-100 outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 sm:max-w-[10rem]"
          />

          <select
            value={status}
            onChange={(event) =>
              changeFilter(() =>
                setStatus(event.target.value),
              )
            }
            aria-label="Filter by status"
            className="h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {isLoading ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 ">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                    <div className="h-3 w-24 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                  </div>

                  <div className="h-4 w-28 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />

                  <div className="h-4 w-16 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />

                  <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" />
                </div>
              ),
            )}
          </div>
        ) : storageSpaces.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
              {hasFilters ? (
                <Search className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
              ) : (
                <Boxes className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
              )}
            </div>

            <h2 className="mt-4 text-sm font-semibold text-neutral-950 dark:text-neutral-100">
              {hasFilters
                ? "No storage spaces match your filters"
                : "No storage spaces"}
            </h2>

            <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
              {hasFilters
                ? "Try adjusting the search or filters."
                : "Create a storage space to define where inventory can be placed."}
            </p>

            {!hasFilters ? (
              <Link
                href="/storage-spaces/new"
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 dark:bg-neutral-100 px-3.5 text-sm font-medium text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-white"
              >
                <Plus className="h-4 w-4" />
                Create storage space
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[820px]">
                <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 shadow-2xs border-b border-neutral-200 dark:border-neutral-800">
                  <tr className="bg-neutral-50 dark:bg-neutral-950">
                    <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Storage space
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Warehouse
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Storage type
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Capacity
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Status
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 ">
                  {storageSpaces.map(
                    (storageSpace) => (
                      <tr
                        key={storageSpace.id}
                        className="transition hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-medium text-neutral-950 dark:text-neutral-100">
                              {storageSpace.name}
                            </p>

                            <p className="mt-0.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                              {storageSpace.code}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-700 dark:text-neutral-300">
                          {
                            storageSpace.warehouseName
                          }
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400 ">
                          {formatStorageType(
                            storageSpace.storageType,
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-mono text-sm text-neutral-700 dark:text-neutral-300">
                          {formatCapacity(
                            storageSpace.capacity,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              STATUS_BADGE_CLASS[
                                storageSpace.status
                              ]
                            }
                          >
                            {storageSpace.status ===
                            "ACTIVE"
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/storage-spaces/${storageSpace.id}`}
                            className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-100"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {pagination ? (
              <div className="shrink-0 flex items-center justify-between gap-4 border-t border-neutral-200 dark:border-neutral-800 px-5 py-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Showing {start}–{end} of{" "}
                  {pagination.total}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.max(1, current - 1),
                      )
                    }
                    disabled={
                      pagination.page <= 1 ||
                      isLoading
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>

                  <span className="text-xs text-neutral-600 dark:text-neutral-400 ">
                    Page {pagination.page} of{" "}
                    {pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(
                          pagination.totalPages,
                          current + 1,
                        ),
                      )
                    }
                    disabled={
                      pagination.page >=
                        pagination.totalPages ||
                      isLoading
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default StorageSpacesPage;
