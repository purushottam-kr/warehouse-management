"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  History,
  Package,
  PackageOpen,
  Plus,
  RefreshCw,
  Warehouse,
} from "lucide-react";

import type { DashboardOverview } from "@/types/dashboard";
import { formatLocationPath } from "@/lib/inventory/location-path";

const formatNumber = (val: number | string) => {
  const num = typeof val === "string" ? Number(val) : val;
  if (isNaN(num)) return "0";
  return num.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });
};

const formatMovementType = (type: "ALLOCATE" | "MOVE" | "RELEASE") => {
  switch (type) {
    case "ALLOCATE":
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-400/30 ">
          ALLOCATE
        </span>
      );
    case "MOVE":
      return (
        <span className="inline-flex items-center rounded-md bg-sky-50 dark:bg-sky-950 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-600/20 dark:ring-sky-400/30 ">
          MOVE
        </span>
      );
    case "RELEASE":
      return (
        <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-950 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-400/30 ">
          RELEASE
        </span>
      );
  }
};

const DashboardPage = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        throw new Error("Failed to load dashboard overview.");
      }
      const json = await response.json();
      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      await fetchDashboard();
    };

    void loadDashboard();
  }, [fetchDashboard]);

  return (
    <div className="mx-auto max-w-7xl flex-1 min-h-0 w-full overflow-y-auto space-y-8 pb-12 pr-1">
      {/* Header & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Operational Overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Real-time summary of warehouse capacity, stock distribution, and activity history.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:outline-hidden disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/50 p-4 text-sm text-red-800 dark:text-red-300">
          <p className="font-medium">{error}</p>
          <button
            onClick={fetchDashboard}
            className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300 underline underline-offset-2 hover:text-red-900 dark:hover:text-red-300 "
          >
            Try again
          </button>
        </div>
      )}

      {/* Quick Operational Actions Bar */}
      <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 p-5 shadow-2xs">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Quick Operational Actions
        </h2>
        <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Link
            href="/allocations"
            className="flex items-center gap-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-neutral-100 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 "
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <ClipboardList className="h-4 w-4" />
            </div>
            <span>Allocate inventory</span>
          </Link>

          <Link
            href="/transfers"
            className="flex items-center gap-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-neutral-100 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 "
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <span>Transfer inventory</span>
          </Link>

          <Link
            href="/releases"
            className="flex items-center gap-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-neutral-100 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 "
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              <PackageOpen className="h-4 w-4" />
            </div>
            <span>Release inventory</span>
          </Link>

          <Link
            href="/items/new"
            className="flex items-center gap-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-neutral-100 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 "
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
              <Plus className="h-4 w-4" />
            </div>
            <span>Add item</span>
          </Link>

          <Link
            href="/warehouses/new"
            className="flex items-center gap-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-neutral-100 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 "
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-purple-100 text-purple-700">
              <Warehouse className="h-4 w-4" />
            </div>
            <span>Add warehouse</span>
          </Link>
        </div>
      </div>

      {/* 1. Inventory Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* Total Warehouses */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium">Total warehouses</span>
            <Warehouse className="h-4 w-4 text-neutral-400 dark:text-neutral-500 " />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            {isLoading ? "—" : formatNumber(data?.summary.totalWarehouses ?? 0)}
          </p>
        </div>

        {/* Active Warehouses */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium">Active warehouses</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 " />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            {isLoading ? "—" : formatNumber(data?.summary.activeWarehouses ?? 0)}
          </p>
        </div>

        {/* Total Items */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium">Total items</span>
            <Package className="h-4 w-4 text-neutral-400 dark:text-neutral-500 " />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            {isLoading ? "—" : formatNumber(data?.summary.totalItems ?? 0)}
          </p>
        </div>

        {/* Items Holding Inventory */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium">Holding inventory</span>
            <ClipboardList className="h-4 w-4 text-emerald-600 dark:text-emerald-400 " />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            {isLoading ? "—" : formatNumber(data?.summary.itemsWithInventory ?? 0)}
          </p>
        </div>

        {/* Total Storage Spaces */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium">Total storage spaces</span>
            <Boxes className="h-4 w-4 text-neutral-400 dark:text-neutral-500 " />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            {isLoading ? "—" : formatNumber(data?.summary.totalStorageSpaces ?? 0)}
          </p>
        </div>

        {/* Active Storage Spaces */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium">Active spaces</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 " />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            {isLoading ? "—" : formatNumber(data?.summary.activeStorageSpaces ?? 0)}
          </p>
        </div>
      </div>

      {/* Main Grid: Warehouse Capacity & Alerts / Activity */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Warehouse Capacity (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100">
                  Warehouse capacity
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Capacity utilization derived strictly from live allocations.
                </p>
              </div>
              <Link
                href="/warehouses"
                className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <span>All warehouses</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="mt-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-2 py-2">
                    <div className="h-4 w-32 rounded-sm bg-neutral-100 dark:bg-neutral-800" />
                    <div className="h-3 w-full rounded-sm bg-neutral-100 dark:bg-neutral-800" />
                  </div>
                ))}
              </div>
            ) : !data?.warehouseCapacities || data.warehouseCapacities.length === 0 ? (
              <div className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
                No active warehouses found.
              </div>
            ) : (
              <div className="mt-5 space-y-5 divide-y divide-neutral-100 dark:divide-neutral-800 ">
                {data.warehouseCapacities.map((wh) => {
                  const pct = wh.capacityPercentage;
                  const isHigh = pct >= 85;
                  const isModerate = pct >= 70;

                  return (
                    <div key={wh.id} className="pt-4 first:pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/warehouses/${wh.id}`}
                            className="font-medium text-neutral-950 dark:text-neutral-100 hover:underline"
                          >
                            {wh.name}
                          </Link>
                          <span className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
                            {wh.code}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-semibold font-mono ${
                            isHigh
                              ? "text-red-600 dark:text-red-400 "
                              : isModerate
                              ? "text-amber-600 dark:text-amber-400 "
                              : "text-neutral-900 dark:text-neutral-100"
                          }`}
                        >
                          {pct.toFixed(1)}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isHigh
                              ? "bg-red-50 dark:bg-red-950 0"
                              : isModerate
                              ? "bg-amber-500 dark:bg-amber-400 "
                              : "bg-neutral-900 dark:bg-neutral-100 "
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>

                      <div className="mt-1.5 flex justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                        <span>
                          {formatNumber(wh.allocatedQuantity)} / {formatNumber(wh.totalCapacity)} units
                        </span>
                        <span>
                          {formatNumber(
                            Math.max(
                              0,
                              Number(wh.totalCapacity) - Number(wh.allocatedQuantity),
                            ),
                          )}{" "}
                          available
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Low-capacity alerts & Recent activity (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* 3. Low-capacity alerts */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 " />
                <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100">
                  Capacity alerts
                </h2>
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">≥ 75% utilized</span>
            </div>

            {isLoading ? (
              <div className="mt-4 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
                ))}
              </div>
            ) : !data?.lowCapacityAlerts || data.lowCapacityAlerts.length === 0 ? (
              <div className="flex items-center gap-2.5 py-6 text-sm text-neutral-600 dark:text-neutral-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 " />
                <span>All storage locations have healthy available capacity.</span>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {data.lowCapacityAlerts.map((alert) => (
                  <div
                    key={`${alert.type}-${alert.id}`}
                    className="flex items-center justify-between rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-950 dark:text-neutral-100">
                          {alert.name}
                        </span>
                        <span className="rounded-md bg-neutral-200/70 dark:bg-neutral-700/70 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-600 dark:text-neutral-400">
                          {alert.type === "WAREHOUSE" ? "Warehouse" : "Space"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                        {formatNumber(alert.allocatedQuantity)} / {formatNumber(alert.totalCapacity)} units
                      </p>
                    </div>

                    <span className="rounded-md bg-red-100 dark:bg-red-950 px-2 py-1 text-xs font-bold text-red-700 dark:text-red-300 font-mono">
                      {alert.capacityPercentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Recent activity */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3.5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100">
                  Recent activity
                </h2>
              </div>
              <Link
                href="/activity"
                className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <span>Full history</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="mt-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
                ))}
              </div>
            ) : !data?.recentActivity || data.recentActivity.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                No inventory movement history yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {data.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col gap-1 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/40 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {formatMovementType(activity.type)}
                        <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                          {activity.item.sku}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-neutral-950 dark:text-neutral-100">
                        {formatNumber(activity.quantity)} {activity.item.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                      <span>
                        {activity.type === "ALLOCATE" && activity.to && (
                          <>To {formatLocationPath({
                            warehouseName:
                              activity.to.warehouseName,
                            aisleName:
                              activity.to.aisleName,
                            bayName:
                              activity.to.bayName,
                            layerName:
                              activity.to.layerName,
                            spaceName:
                              activity.to.name,
                          })}</>
                        )}
                        {activity.type === "MOVE" && activity.from && activity.to && (
                          <>{formatLocationPath({
                            warehouseName:
                              activity.from.warehouseName,
                            aisleName:
                              activity.from.aisleName,
                            bayName:
                              activity.from.bayName,
                            layerName:
                              activity.from.layerName,
                            spaceName:
                              activity.from.name,
                          })} → {formatLocationPath({
                            warehouseName:
                              activity.to.warehouseName,
                            aisleName:
                              activity.to.aisleName,
                            bayName:
                              activity.to.bayName,
                            layerName:
                              activity.to.layerName,
                            spaceName:
                              activity.to.name,
                          })}</>
                        )}
                        {activity.type === "RELEASE" && activity.from && (
                          <>From {formatLocationPath({
                            warehouseName:
                              activity.from.warehouseName,
                            aisleName:
                              activity.from.aisleName,
                            bayName:
                              activity.from.bayName,
                            layerName:
                              activity.from.layerName,
                            spaceName:
                              activity.from.name,
                          })}</>
                        )}
                      </span>
                      <span>
                        {new Date(activity.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;