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
import type { Item } from "@/types/item";

type ItemsResponse = {
  data: Item[];
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

type StorageSpaceOption = {
  id: string;
  name: string;
  code: string;
};

const PAGE_SIZE = 25;

const ItemsPage = () => {
  const [searchInput, setSearchInput] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [storageSpaceId, setStorageSpaceId] =
    useState("");
  const [page, setPage] = useState(1);

  const [warehouseOptions, setWarehouseOptions] =
    useState<WarehouseOption[]>([]);
  const [spaceOptions, setSpaceOptions] = useState<
    StorageSpaceOption[]
  >([]);
  const [isLoadingSpaces, setIsLoadingSpaces] =
    useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [pagination, setPagination] =
    useState<ListPagination | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const hasFilters =
    searchInput.trim() !== "" ||
    warehouseId !== "" ||
    storageSpaceId !== "";

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
        // Option lists are best-effort; the item
        // query surfaces its own errors.
      }
    };

    void loadWarehouseOptions();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadSpaceOptions = async () => {
      if (!warehouseId) {
        setSpaceOptions([]);
        setIsLoadingSpaces(false);
        return;
      }

      setIsLoadingSpaces(true);

      try {
        const response = await fetch(
          `/api/warehouses/${warehouseId}/storage-spaces`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = (await response.json()) as
          | { data: StorageSpaceOption[] }
          | ApiErrorResponse;

        if (
          response.ok &&
          "data" in data &&
          !controller.signal.aborted
        ) {
          setSpaceOptions(data.data);
        }
      } catch {
        // Option lists are best-effort; the item
        // query surfaces its own errors.
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSpaces(false);
        }
      }
    };

    void loadSpaceOptions();

    return () => {
      controller.abort();
    };
  }, [warehouseId]);

  useEffect(() => {
    const controller = new AbortController();

    const loadItems = async () => {
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));

        const trimmedSearch = searchInput.trim();

        if (trimmedSearch) {
          params.set("search", trimmedSearch);
        }

        if (warehouseId) {
          params.set("warehouseId", warehouseId);
        }

        if (storageSpaceId) {
          params.set("storageSpaceId", storageSpaceId);
        }

        const response = await fetch(
          `/api/items?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = (await response.json()) as
          | ItemsResponse
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error?.message ??
                  "Unable to load items."
              : "Unable to load items.",
          );
        }

        if (!("data" in data)) {
          throw new Error(
            "Invalid item response.",
          );
        }

        setItems(data.data);
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
            : "Unable to load items.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(
      () => void loadItems(),
      searchInput ? 300 : 0,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchInput, warehouseId, storageSpaceId, page]);

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
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
              Items
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Manage product catalog and storage
              requirements.
            </p>
          </div>

          <Link
            href="/items/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" />
            New item
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

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

            <input
              type="search"
              value={searchInput}
              onChange={(event) =>
                changeFilter(() =>
                  setSearchInput(event.target.value),
                )
              }
              placeholder="Search SKU or item name"
              aria-label="Search items"
              className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
            />
          </div>

          <select
            value={warehouseId}
            onChange={(event) => {
              const nextWarehouseId =
                event.target.value;

              changeFilter(() => {
                setWarehouseId(nextWarehouseId);

                /*
                 * Spaces are warehouse-scoped, so the
                 * space selection can never survive a
                 * warehouse change.
                 */
                setStorageSpaceId("");
              });
            }}
            aria-label="Filter by warehouse"
            className="h-10 max-w-xs rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
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

          <select
            value={storageSpaceId}
            onChange={(event) =>
              changeFilter(() =>
                setStorageSpaceId(event.target.value),
              )
            }
            aria-label="Filter by storage space"
            disabled={!warehouseId || isLoadingSpaces}
            className="h-10 max-w-xs rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"
          >
            <option value="">
              {!warehouseId
                ? "All storage spaces"
                : isLoadingSpaces
                  ? "Loading spaces..."
                  : "All storage spaces"}
            </option>

            {spaceOptions.map((option) => (
              <option
                key={option.id}
                value={option.id}
              >
                {option.name} ({option.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {isLoading ? (
          <div className="divide-y divide-neutral-100">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="h-4 w-28 animate-pulse rounded bg-neutral-100" />

                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
                    <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
                  </div>

                  <div className="h-4 w-16 animate-pulse rounded bg-neutral-100" />
                </div>
              ),
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100">
              {hasFilters ? (
                <Search className="h-5 w-5 text-neutral-500" />
              ) : (
                <Boxes className="h-5 w-5 text-neutral-500" />
              )}
            </div>

            <h2 className="mt-4 text-sm font-semibold text-neutral-950">
              {hasFilters
                ? "No items match your filters"
                : "No items yet"}
            </h2>

            <p className="mt-1 max-w-sm text-sm text-neutral-500">
              {hasFilters
                ? "Try adjusting the search or filters."
                : "Create your first item to start tracking inventory and storage requirements."}
            </p>

            {!hasFilters ? (
              <Link
                href="/items/new"
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 px-3.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                <Plus className="h-4 w-4" />
                Create item
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[640px]">
                <thead className="sticky top-0 z-10 bg-neutral-50 shadow-2xs border-b border-neutral-200">
                  <tr className="bg-neutral-50">
                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      SKU
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Item name
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Unit
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Required storage
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">
                      <span className="sr-only">
                        View
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-neutral-50"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/items/${item.id}`}
                          className="font-mono text-sm text-neutral-950 hover:underline"
                        >
                          {item.sku}
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/items/${item.id}`}
                          className="font-medium text-neutral-950 hover:underline"
                        >
                          {item.name}
                        </Link>
                      </td>

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {item.unit}
                      </td>

                      <td className="px-5 py-4">
                        {item.requiredStorageType ? (
                          <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-xs font-medium text-neutral-600">
                            {
                              item.requiredStorageType
                            }
                          </span>
                        ) : (
                          <span className="text-sm text-neutral-400">
                            Any
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/items/${item.id}`}
                          className="text-sm font-medium text-neutral-600 hover:text-neutral-950 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination ? (
              <div className="shrink-0 flex items-center justify-between gap-4 border-t border-neutral-200 px-5 py-3">
                <p className="text-xs text-neutral-500">
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
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>

                  <span className="text-xs text-neutral-600">
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
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
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

export default ItemsPage;
