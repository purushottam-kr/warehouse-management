"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Warehouse = {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
};

type WarehousesResponse = {
  data: Warehouse[];
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type CreateStorageSpaceResponse = {
  data: {
    id: string;
  };
};

const CAPACITY_PATTERN = /^\d{1,9}(\.\d{1,3})?$/;

const NewStorageSpacePage = () => {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [storageType, setStorageType] = useState("");
  const [capacity, setCapacity] = useState("");

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        setError("");

        const response = await fetch("/api/warehouses", {
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

        setWarehouses(
          data.data.filter((warehouse) => warehouse.status === "ACTIVE"),
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load warehouses.",
        );
      } finally {
        setIsLoadingWarehouses(false);
      }
    };

    void loadWarehouses();
  }, []);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const trimmedStorageType = storageType.trim().toUpperCase();
    const trimmedCapacity = capacity.trim();

    if (!trimmedName) {
      setError("Storage space name is required.");
      return;
    }

    if (!trimmedCode) {
      setError("Storage space code is required.");
      return;
    }

    if (!warehouseId) {
      setError("Warehouse is required.");
      return;
    }

    if (!trimmedStorageType) {
      setError("Storage type is required.");
      return;
    }

    if (
      !CAPACITY_PATTERN.test(trimmedCapacity) ||
      Number(trimmedCapacity) <= 0
    ) {
      setError(
        "Capacity must be a valid positive decimal with up to 9 integer digits and 3 decimal places.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/storage-spaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          warehouseId,
          name: trimmedName,
          code: trimmedCode,
          capacity: trimmedCapacity,
          storageType: trimmedStorageType,
        }),
      });

      const data = (await response.json()) as
        | CreateStorageSpaceResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ?? "Unable to create storage space."
            : "Unable to create storage space.",
        );
      }

      if (!("data" in data)) {
        throw new Error("Invalid storage space response.");
      }

      router.push(`/storage-spaces/${data.data.id}`);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create storage space.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/storage-spaces"
        className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to storage spaces
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          New storage space
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Add a storage location to an active warehouse.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white"
      >
        <div className="space-y-5 p-6">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="warehouse"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Warehouse
            </label>

            <select
              id="warehouse"
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              disabled={isLoadingWarehouses || isSubmitting}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
            >
              <option value="">
                {isLoadingWarehouses
                  ? "Loading warehouses..."
                  : "Select warehouse"}
              </option>

              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>

            {!isLoadingWarehouses && warehouses.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                No active warehouses are available.
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Name
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Cold Storage A"
                maxLength={100}
                disabled={isSubmitting}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="code"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Code
              </label>

              <input
                id="code"
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="CS-01"
                maxLength={50}
                disabled={isSubmitting}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm uppercase outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="storageType"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Storage type
              </label>

              <input
                id="storageType"
                type="text"
                value={storageType}
                onChange={(event) => setStorageType(event.target.value)}
                placeholder="Cold"
                maxLength={50}
                disabled={isSubmitting}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="capacity"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Capacity
              </label>

              <input
                id="capacity"
                type="text"
                inputMode="decimal"
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                placeholder="1000.000"
                disabled={isSubmitting}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
              />

              <p className="mt-1.5 text-xs text-slate-500">
                Up to 9 integer digits and 3 decimal places.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
          <Link
            href="/storage-spaces"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              isLoadingWarehouses ||
              warehouses.length === 0
            }
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create storage space"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewStorageSpacePage;