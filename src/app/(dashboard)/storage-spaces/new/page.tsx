"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { STORAGE_TYPES } from "@/lib/inventory/storage-type";

type Warehouse = {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
  deletedAt?: string | null;
};

type WarehousesResponse = {
  data: Warehouse[];
};

type LocationOption = {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
};

type LocationsResponse = {
  data: LocationOption[];
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

const NewStorageSpaceForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const warehouseParam = searchParams.get("warehouse") ?? "";

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [aisles, setAisles] = useState<LocationOption[]>([]);
  const [bays, setBays] = useState<LocationOption[]>([]);
  const [layers, setLayers] = useState<LocationOption[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [warehouseId, setWarehouseId] = useState(warehouseParam);
  const [aisleId, setAisleId] = useState("");
  const [bayId, setBayId] = useState("");
  const [layerId, setLayerId] = useState("");
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

        const activeWarehouses = data.data.filter(
          (warehouse) => warehouse.status === "ACTIVE",
        );

        if (
          warehouseParam &&
          !activeWarehouses.some(
            (warehouse) => warehouse.id === warehouseParam,
          )
        ) {
          const detailResponse = await fetch(
            `/api/warehouses/${warehouseParam}`,
            { cache: "no-store" },
          );

          const detailData = (await detailResponse.json()) as
            | { data: Warehouse }
            | ApiErrorResponse;

          if (
            detailResponse.ok &&
            "data" in detailData &&
            detailData.data.deletedAt == null
          ) {
            activeWarehouses.push(detailData.data);
          } else {
            setWarehouseId("");
          }
        }

        setWarehouses(activeWarehouses);
      } catch (error) {
        setWarehouseId("");

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
  }, [warehouseParam]);

  const loadLocations = async <T extends LocationOption>(
    url: string,
    setter: (options: T[]) => void,
    fallback: string,
  ): Promise<boolean> => {
    try {
      const response = await fetch(url, {
        cache: "no-store",
      });

      const data = (await response.json()) as
        | LocationsResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ?? fallback
            : fallback,
        );
      }

      if (!("data" in data)) {
        throw new Error(fallback);
      }

      setter(
        data.data.filter(
          (option) => option.status === "ACTIVE",
        ) as T[],
      );

      return true;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : fallback,
      );

      return false;
    }
  };

  useEffect(() => {
    if (!warehouseId) {
      return;
    }

    const loadAisles = async () => {
      setIsLoadingLocations(true);

      await loadLocations(
        `/api/warehouses/${warehouseId}/aisles`,
        setAisles,
        "Unable to load aisles.",
      );

      setIsLoadingLocations(false);
    };

    void loadAisles();
  }, [warehouseId]);

  useEffect(() => {
    if (!aisleId) {
      return;
    }

    const loadBays = async () => {
      setIsLoadingLocations(true);

      await loadLocations(
        `/api/aisles/${aisleId}/bays`,
        setBays,
        "Unable to load bays.",
      );

      setIsLoadingLocations(false);
    };

    void loadBays();
  }, [aisleId]);

  useEffect(() => {
    if (!bayId) {
      return;
    }

    const loadLayers = async () => {
      setIsLoadingLocations(true);

      await loadLocations(
        `/api/bays/${bayId}/layers`,
        setLayers,
        "Unable to load layers.",
      );

      setIsLoadingLocations(false);
    };

    void loadLayers();
  }, [bayId]);

  const handleWarehouseChange = (nextWarehouseId: string) => {
    setWarehouseId(nextWarehouseId);
    setAisles([]);
    setBays([]);
    setLayers([]);
    setAisleId("");
    setBayId("");
    setLayerId("");
  };

  const handleAisleChange = (nextAisleId: string) => {
    setAisleId(nextAisleId);
    setBays([]);
    setLayers([]);
    setBayId("");
    setLayerId("");
  };

  const handleBayChange = (nextBayId: string) => {
    setBayId(nextBayId);
    setLayers([]);
    setLayerId("");
  };

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

    if (!layerId) {
      setError("Layer is required.");
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
          layerId,
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

      router.push(
        warehouseParam
          ? `/warehouses/${warehouseParam}`
          : `/storage-spaces/${data.data.id}`,
      );
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
        href={warehouseParam ? `/warehouses/${warehouseParam}` : "/storage-spaces"}
        className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 transition-colors hover:text-neutral-950 dark:hover:text-neutral-100 "
      >
        <ArrowLeft className="h-4 w-4" />
        {warehouseParam ? "Back to warehouse" : "Back to storage spaces"}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 ">
          New storage space
        </h1>

        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 ">
          Add a storage location to a layer inside an active
          warehouse.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
      >
        <div className="space-y-5 p-6">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300 "
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="warehouse"
              className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Warehouse
            </label>

              <select
                id="warehouse"
                value={warehouseId}
                onChange={(event) =>
                  handleWarehouseChange(event.target.value)
                }
              disabled={isLoadingWarehouses || isSubmitting}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
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
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 ">
                No active warehouses are available.
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label
                htmlFor="aisle"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Aisle
              </label>

              <select
                id="aisle"
                value={aisleId}
                onChange={(event) =>
                  handleAisleChange(event.target.value)
                }
                disabled={
                  !warehouseId ||
                  isLoadingLocations ||
                  isSubmitting
                }
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
              >
                <option value="">
                  {!warehouseId
                    ? "Select warehouse first"
                    : "Select aisle"}
                </option>

                {aisles.map((aisle) => (
                  <option key={aisle.id} value={aisle.id}>
                    {aisle.name} ({aisle.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bay"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Bay
              </label>

              <select
                id="bay"
                value={bayId}
                onChange={(event) =>
                  handleBayChange(event.target.value)
                }
                disabled={
                  !aisleId ||
                  isLoadingLocations ||
                  isSubmitting
                }
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
              >
                <option value="">
                  {!aisleId
                    ? "Select aisle first"
                    : "Select bay"}
                </option>

                {bays.map((bay) => (
                  <option key={bay.id} value={bay.id}>
                    {bay.name} ({bay.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="layer"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Layer
              </label>

              <select
                id="layer"
                value={layerId}
                onChange={(event) =>
                  setLayerId(event.target.value)
                }
                disabled={
                  !bayId ||
                  isLoadingLocations ||
                  isSubmitting
                }
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
              >
                <option value="">
                  {!bayId ? "Select bay first" : "Select layer"}
                </option>

                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name} ({layer.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {warehouseId && aisles.length === 0 && !isLoadingLocations && (
            <p className="text-xs text-amber-600 dark:text-amber-400 ">
              This warehouse has no aisles yet — add one from
              the warehouse page first.
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
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
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2.5 text-sm outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
              />
            </div>

            <div>
              <label
                htmlFor="code"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
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
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2.5 text-sm uppercase outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="storageType"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Storage type
              </label>

              <select
                id="storageType"
                value={storageType}
                onChange={(event) => setStorageType(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2.5 text-sm outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
              >
                <option value="">Select storage type</option>
                {STORAGE_TYPES.map((storageType) => (
                  <option key={storageType} value={storageType}>
                    {storageType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="capacity"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
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
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2.5 text-sm outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
              />

              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 ">
                Up to 9 integer digits and 3 decimal places.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 px-6 py-4">
          <Link
            href={warehouseParam ? `/warehouses/${warehouseParam}` : "/storage-spaces"}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 "
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
            className="rounded-md bg-neutral-950 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-950 transition-colors hover:bg-neutral-800 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create storage space"}
          </button>
        </div>
      </form>
    </div>
  );
};

const NewStorageSpacePage = () => {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl">
          <div className="h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 " />
        </div>
      }
    >
      <NewStorageSpaceForm />
    </Suspense>
  );
};

export default NewStorageSpacePage;