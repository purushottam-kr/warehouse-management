"use client";

import {
  ArrowLeft,
  ArrowRight,
  PackageOpen,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";

type MovementType = "ALLOCATE" | "MOVE" | "RELEASE";

type MovementActivity = {
  id: string;
  type: MovementType;
  quantity: string;
  createdAt: string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
  from: {
    id: string;
    name: string;
    code: string;
    warehouseName: string;
  } | null;
  to: {
    id: string;
    name: string;
    code: string;
    warehouseName: string;
  } | null;
  performedBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

type MovementPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type MovementsResponse = {
  data: MovementActivity[];
  pagination: MovementPagination;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type ItemOption = {
  id: string;
  sku: string;
  name: string;
};

type WarehouseOption = {
  id: string;
  name: string;
};

const PAGE_SIZE = 25;

const formatQuantity = (value: string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const TYPE_BADGE_CLASS: Record<MovementType, string> = {
  ALLOCATE:
    "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-xs font-medium text-emerald-700",
  MOVE: "inline-flex rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-xs font-medium text-neutral-600",
  RELEASE:
    "inline-flex rounded-full bg-amber-50 px-2.5 py-1 font-mono text-xs font-medium text-amber-700",
};

const ActivityPage = () => {
  const [searchInput, setSearchInput] = useState("");
  const [type, setType] = useState("");
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [page, setPage] = useState(1);

  const [itemOptions, setItemOptions] = useState<
    ItemOption[]
  >([]);
  const [warehouseOptions, setWarehouseOptions] =
    useState<WarehouseOption[]>([]);

  const [movements, setMovements] = useState<
    MovementActivity[]
  >([]);
  const [pagination, setPagination] =
    useState<MovementPagination | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const hasFilters =
    searchInput.trim() !== "" ||
    type !== "" ||
    itemId !== "" ||
    warehouseId !== "";

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [itemsResponse, warehousesResponse] =
          await Promise.all([
            fetch("/api/items", {
              cache: "no-store",
            }),
            fetch("/api/warehouses", {
              cache: "no-store",
            }),
          ]);

        const itemsData =
          (await itemsResponse.json()) as
            | { data: ItemOption[] }
            | ApiErrorResponse;

        const warehousesData =
          (await warehousesResponse.json()) as
            | { data: WarehouseOption[] }
            | ApiErrorResponse;

        if (itemsResponse.ok && "data" in itemsData) {
          setItemOptions(itemsData.data);
        }

        if (
          warehousesResponse.ok &&
          "data" in warehousesData
        ) {
          setWarehouseOptions(
            warehousesData.data,
          );
        }
      } catch {
        // Option lists are best-effort; the movement
        // query surfaces its own errors.
      }
    };

    void loadOptions();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadMovements = async () => {
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

        if (type) {
          params.set("type", type);
        }

        if (itemId) {
          params.set("itemId", itemId);
        }

        if (warehouseId) {
          params.set("warehouseId", warehouseId);
        }

        const response = await fetch(
          `/api/inventory-movements?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = (await response.json()) as
          | MovementsResponse
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error?.message ??
                  "Unable to load activity."
              : "Unable to load activity.",
          );
        }

        if (!("data" in data)) {
          throw new Error(
            "Invalid activity response.",
          );
        }

        setMovements(data.data);
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
            : "Unable to load activity.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(
      () => void loadMovements(),
      searchInput ? 300 : 0,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchInput, type, itemId, warehouseId, page]);

  const changeFilter = (
    apply: () => void,
  ) => {
    setPage(1);
    apply();
  };

  const start =
    pagination && pagination.total > 0
      ? (pagination.page - 1) *
          pagination.pageSize +
        1
      : 0;

  const end =
    pagination
      ? Math.min(
          pagination.page * pagination.pageSize,
          pagination.total,
        )
      : 0;

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden space-y-4">
      <div className="shrink-0 space-y-4 pb-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            Activity
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Inventory movement history across all
            warehouses.
          </p>
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
              placeholder="Search by SKU or item name"
              aria-label="Search activity"
              className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
            />
          </div>

          <select
            value={type}
            onChange={(event) =>
              changeFilter(() =>
                setType(event.target.value),
              )
            }
            aria-label="Filter by movement type"
            className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
          >
            <option value="">All types</option>
            <option value="ALLOCATE">Allocate</option>
            <option value="MOVE">Move</option>
            <option value="RELEASE">Release</option>
          </select>

          <select
            value={itemId}
            onChange={(event) =>
              changeFilter(() =>
                setItemId(event.target.value),
              )
            }
            aria-label="Filter by item"
            className="h-10 max-w-xs rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
          >
            <option value="">All items</option>

            {itemOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} — {option.sku}
              </option>
            ))}
          </select>

          <select
            value={warehouseId}
            onChange={(event) =>
              changeFilter(() =>
                setWarehouseId(event.target.value),
              )
            }
            aria-label="Filter by warehouse"
            className="h-10 max-w-xs rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
          >
            <option value="">All warehouses</option>

            {warehouseOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {isLoading ? (
          <div className="divide-y divide-neutral-100">
            {Array.from({ length: 6 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="h-6 w-20 animate-pulse rounded-full bg-neutral-100" />

                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
                    <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
                  </div>

                  <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />

                  <div className="h-4 w-16 animate-pulse rounded bg-neutral-100" />
                </div>
              ),
            )}
          </div>
        ) : movements.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100">
              {hasFilters ? (
                <Search className="h-5 w-5 text-neutral-500" />
              ) : (
                <PackageOpen className="h-5 w-5 text-neutral-500" />
              )}
            </div>

            <h2 className="mt-4 text-sm font-semibold text-neutral-950">
              {hasFilters
                ? "No movements match your filters"
                : "No activity yet"}
            </h2>

            <p className="mt-1 max-w-sm text-sm text-neutral-500">
              {hasFilters
                ? "Try adjusting the search or filters."
                : "Allocate inventory to an item and its movements will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[860px]">
                <thead className="sticky top-0 z-10 bg-neutral-50 shadow-2xs border-b border-neutral-200">
                  <tr className="bg-neutral-50">
                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Movement
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Item
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      From
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      To
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Qty
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      By
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="transition hover:bg-neutral-50"
                    >
                      <td className="px-5 py-4">
                        <span
                          className={
                            TYPE_BADGE_CLASS[
                              movement.type
                            ]
                          }
                        >
                          {movement.type}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-neutral-950">
                          {movement.item.name}
                        </p>

                        <p className="mt-0.5 font-mono text-xs text-neutral-500">
                          {movement.item.sku}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {movement.from ? (
                          <>
                            <p className="text-sm text-neutral-950">
                              {
                                movement.from
                                  .name
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-neutral-500">
                              {
                                movement.from
                                  .warehouseName
                              }
                            </p>
                          </>
                        ) : (
                          <span className="text-sm text-neutral-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {movement.to ? (
                          <>
                            <p className="text-sm text-neutral-950">
                              {movement.to.name}
                            </p>

                            <p className="mt-0.5 text-xs text-neutral-500">
                              {
                                movement.to
                                  .warehouseName
                              }
                            </p>
                          </>
                        ) : (
                          <span className="text-sm text-neutral-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-mono text-sm text-neutral-950">
                        {formatQuantity(
                          movement.quantity,
                        )}{" "}
                        <span className="font-sans text-xs text-neutral-500">
                          {movement.item.unit}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {movement.performedBy
                          .name ??
                          movement.performedBy
                            .email}
                      </td>

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {formatDateTime(
                          movement.createdAt,
                        )}
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
                        Math.max(
                          1,
                          current - 1,
                        ),
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

export default ActivityPage;
