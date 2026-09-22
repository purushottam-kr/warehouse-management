"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { ListPagination } from "@/types/pagination";
import type { WarehouseListRow } from "@/types/warehouse";

type WarehousesResponse = {
  data: WarehouseListRow[];
  pagination: ListPagination;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

const PAGE_SIZE = 25;

const formatQuantity = (value: string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const STATUS_BADGE_CLASS = {
  ACTIVE:
    "inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300",
  INACTIVE:
    "inline-flex rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 ",
} as const;

const WarehousesPage = () => {
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [warehouses, setWarehouses] = useState<
    WarehouseListRow[]
  >([]);
  const [pagination, setPagination] =
    useState<ListPagination | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const hasFilters =
    searchInput.trim() !== "" || status !== "";

  useEffect(() => {
    const controller = new AbortController();

    const loadWarehouses = async () => {
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

        if (status) {
          params.set("status", status);
        }

        const response = await fetch(
          `/api/warehouses?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = (await response.json()) as
          | WarehousesResponse
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error?.message ??
                  "Unable to load warehouses."
              : "Unable to load warehouses.",
          );
        }

        if (!("data" in data)) {
          throw new Error(
            "Invalid warehouse response.",
          );
        }

        setWarehouses(data.data);
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
            : "Unable to load warehouses.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(
      () => void loadWarehouses(),
      searchInput ? 300 : 0,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchInput, status, page]);

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
              Warehouses
            </h1>

            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Manage warehouse locations and their operational status.
            </p>
          </div>

          <Link
            href="/warehouses/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 dark:bg-neutral-100 px-4 text-sm font-medium text-white dark:text-neutral-950 transition hover:bg-neutral-800 dark:hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            New warehouse
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
              aria-label="Search warehouses"
              className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 text-sm text-neutral-950 dark:text-neutral-100 outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 "
            />
          </div>

          <select
            value={status}
            onChange={(event) =>
              changeFilter(() =>
                setStatus(event.target.value),
              )
            }
            aria-label="Filter by status"
            className="h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 "
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
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />

                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                  <div className="h-3 w-32 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                </div>

                <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" />

                <div className="h-4 w-14 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
              </div>
            ))}
          </div>
        ) : warehouses.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
              {hasFilters ? (
                <Search className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
              ) : (
                <WarehouseIcon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
              )}
            </div>

            <h2 className="mt-4 text-sm font-semibold text-neutral-950 dark:text-neutral-100">
              {hasFilters
                ? "No warehouses match your filters"
                : "No warehouses yet"}
            </h2>

            <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
              {hasFilters
                ? "Try adjusting the search or filters."
                : "Create your first warehouse to start organizing storage spaces and inventory."}
            </p>

            {!hasFilters ? (
              <Link
                href="/warehouses/new"
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 dark:bg-neutral-100 px-3.5 text-sm font-medium text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-white"
              >
                <Plus className="h-4 w-4" />
                Create warehouse
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[720px]">
                <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 shadow-2xs border-b border-neutral-200 dark:border-neutral-800">
                  <tr className="bg-neutral-50 dark:bg-neutral-950">
                    <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Code
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Name
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Address
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Status
                    </th>

                    <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Capacity
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 ">
                  {warehouses.map((warehouse) => {
                    const total = Number(
                      warehouse.totalCapacity,
                    );
                    const allocated = Number(
                      warehouse.allocatedQuantity,
                    );

                    const utilization =
                      total > 0
                        ? Math.round(
                            (allocated / total) *
                              100,
                          )
                        : null;

                    return (
                      <tr
                        key={warehouse.id}
                        className="transition hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      >
                        <td className="px-5 py-4">
                          <span className="font-mono text-sm text-neutral-600 dark:text-neutral-400 ">
                            {warehouse.code}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/warehouses/${warehouse.id}`}
                            className="font-medium text-neutral-950 dark:text-neutral-100 hover:underline"
                          >
                            {warehouse.name}
                          </Link>
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400 ">
                          {warehouse.address || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              STATUS_BADGE_CLASS[
                                warehouse.status
                              ]
                            }
                          >
                            {warehouse.status ===
                            "ACTIVE"
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td
                          className="px-5 py-4 text-right font-mono text-sm text-neutral-700 dark:text-neutral-300"
                          title={
                            total > 0
                              ? `${formatQuantity(
                                  warehouse.allocatedQuantity,
                                )} of ${formatQuantity(
                                  warehouse.totalCapacity,
                                )} allocated`
                              : "No storage spaces configured"
                          }
                        >
                          {utilization === null
                            ? "—"
                            : `${utilization}%`}
                        </td>
                      </tr>
                    );
                  })}
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
                      pagination.page <= 1 || isLoading
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

export default WarehousesPage;
