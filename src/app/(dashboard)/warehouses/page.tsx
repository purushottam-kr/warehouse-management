"use client";

import Link from "next/link";
import { Plus, Warehouse as WarehouseIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type { Warehouse } from "@/types/warehouse";

type WarehousesResponse = {
  data: Warehouse[];
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

const WarehousesPage = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const response = await fetch("/api/warehouses", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as
          | WarehousesResponse
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error?.message ?? "Unable to load warehouses."
              : "Unable to load warehouses.",
          );
        }

        if (!("data" in data)) {
          throw new Error("Invalid warehouse response.");
        }

        setWarehouses(data.data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load warehouses.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadWarehouses();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            Warehouses
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Manage warehouse locations and their operational status.
          </p>
        </div>

        <Link
          href="/warehouses/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" />
          New warehouse
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

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {isLoading ? (
          <div className="divide-y divide-neutral-100">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="h-9 w-9 animate-pulse rounded-lg bg-neutral-100" />

                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
                </div>

                <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : warehouses.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100">
              <WarehouseIcon className="h-5 w-5 text-neutral-500" />
            </div>

            <h2 className="mt-4 text-sm font-semibold text-neutral-950">
              No warehouses yet
            </h2>

            <p className="mt-1 max-w-sm text-sm text-neutral-500">
              Create your first warehouse to start organizing
              storage spaces and inventory.
            </p>

            <Link
              href="/warehouses/new"
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 px-3.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              <Plus className="h-4 w-4" />
              Create warehouse
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Warehouse
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Code
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Address
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {warehouses.map((warehouse) => (
                  <tr
                    key={warehouse.id}
                    className="transition hover:bg-neutral-50"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/warehouses/${warehouse.id}`}
                        className="font-medium text-neutral-950 hover:underline"
                      >
                        {warehouse.name}
                      </Link>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-mono text-sm text-neutral-600">
                        {warehouse.code}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-neutral-600">
                      {warehouse.address || "—"}
                    </td>

                    <td className="px-5 py-4">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehousesPage;