"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  MapPin,
  Pencil,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import type { ItemAllocationSummary } from "@/types/allocation";

type Item = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  requiredStorageType: string | null;
  createdAt: string;
  updatedAt: string;
};

type ItemResponse = {
  data: Item;
};

type AllocationSummaryResponse = {
  data: ItemAllocationSummary;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

const QUANTITY_PATTERN = /^\d+(\.\d{1,3})?$/;

const formatQuantity = (value: string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const ItemDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [summary, setSummary] =
    useState<ItemAllocationSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventoryError, setInventoryError] =
    useState("");

  const [isAllocateOpen, setIsAllocateOpen] =
    useState(false);
  const [quantity, setQuantity] = useState("");
  const [isAllocating, setIsAllocating] =
    useState(false);
  const [allocateError, setAllocateError] =
    useState("");

  const loadSummary = async () => {
    const response = await fetch(
      `/api/items/${params.id}/allocations`,
      { cache: "no-store" },
    );

    const data =
      (await response.json()) as
        | AllocationSummaryResponse
        | ApiErrorResponse;

    if (!response.ok) {
      throw new Error(
        "error" in data
          ? data.error?.message ??
              "Unable to load inventory."
          : "Unable to load inventory.",
      );
    }

    if (!("data" in data)) {
      throw new Error(
        "Invalid inventory response.",
      );
    }

    setSummary(data.data);
  };

  useEffect(() => {
    const loadItem = async () => {
      try {
        setError("");
        setInventoryError("");
        setSummary(null);

        const itemResponse = await fetch(
          `/api/items/${params.id}`,
          { cache: "no-store" },
        );

        const itemData =
          (await itemResponse.json()) as
            | ItemResponse
            | ApiErrorResponse;

        if (!itemResponse.ok) {
          throw new Error(
            "error" in itemData
              ? itemData.error?.message ??
                  "Unable to load item."
              : "Unable to load item.",
          );
        }

        if (!("data" in itemData)) {
          throw new Error(
            "Invalid item response.",
          );
        }

        setItem(itemData.data);

        /*
         * A failed inventory lookup must not hide
         * the item itself.
         */
        try {
          await loadSummary();
        } catch (summaryError) {
          setInventoryError(
            summaryError instanceof Error
              ? summaryError.message
              : "Unable to load inventory.",
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load item.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleAllocate = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setAllocateError("");

    const trimmedQuantity = quantity.trim();

    if (
      !QUANTITY_PATTERN.test(trimmedQuantity) ||
      Number(trimmedQuantity) <= 0
    ) {
      setAllocateError(
        "Quantity must be a positive decimal with up to 3 decimal places.",
      );
      return;
    }

    setIsAllocating(true);

    try {
      const response = await fetch(
        "/api/allocations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            itemId: params.id,
            quantity: trimmedQuantity,
          }),
        },
      );

      const data = (await response.json()) as
        | {
            itemId: string;
            requestedQuantity: string;
            allocations: Array<{
              storageSpaceId: string;
              quantity: string;
            }>;
          }
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ??
                "Unable to allocate inventory."
            : "Unable to allocate inventory.",
        );
      }

      setIsAllocateOpen(false);
      setQuantity("");
      setAllocateError("");

      await loadSummary();
      router.refresh();
    } catch (error) {
      setAllocateError(
        error instanceof Error
          ? error.message
          : "Unable to allocate inventory.",
      );
    } finally {
      setIsAllocating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />

        <div className="h-8 w-72 animate-pulse rounded bg-neutral-200" />

        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map(
            (_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-white"
              />
            ),
          )}
        </div>

        <div className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-white" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Link
          href="/items"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to items
        </Link>

        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-neutral-950">
            Item not found
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            {error ||
              "The item may have been deleted or is no longer available."}
          </p>
        </div>
      </div>
    );
  }

  const locations = summary?.locations ?? [];
  const totalQuantity =
    summary?.totalQuantity ?? "0";

  return (
    <div className="space-y-6">
      <Link
        href="/items"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Items
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-sm text-neutral-500">
            {item.sku}
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
            {item.name}
          </h1>

          {item.description ? (
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              {item.description}
            </p>
          ) : null}
        </div>

        <Link
          href={`/items/${item.id}/edit`}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          <Pencil className="h-4 w-4" />
          Edit
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Required storage
          </p>

          <p className="mt-2 text-lg font-semibold text-neutral-950">
            {item.requiredStorageType ?? "Any"}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            {item.requiredStorageType
              ? "Allocations target this storage type."
              : "No storage type restriction."}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Total inventory
          </p>

          <p className="mt-2 text-lg font-semibold text-neutral-950">
            {formatQuantity(totalQuantity)}{" "}
            <span className="text-sm font-normal text-neutral-500">
              {item.unit}
            </span>
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Sum of all allocations.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Storage locations
          </p>

          <p className="mt-2 text-lg font-semibold text-neutral-950">
            {locations.length}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Distinct spaces holding this item.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-950">
            Storage locations
          </h2>

          <button
            type="button"
            onClick={() => {
              setAllocateError("");
              setIsAllocateOpen(true);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 px-3.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            <Boxes className="h-4 w-4" />
            Allocate inventory
          </button>
        </div>

        {inventoryError ? (
          <div
            role="alert"
            className="border-b border-neutral-200 px-5 py-3 text-sm text-red-700"
          >
            {inventoryError}
          </div>
        ) : null}

        {locations.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100">
              <MapPin className="h-5 w-5 text-neutral-500" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-neutral-950">
              No inventory allocated
            </h3>

            <p className="mt-1 max-w-sm text-sm text-neutral-500">
              Allocate inventory to store this item
              in eligible storage spaces.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
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
                    Quantity
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {locations.map((location) => (
                  <tr
                    key={location.storageSpaceId}
                    className="transition hover:bg-neutral-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-neutral-950">
                        {
                          location.storageSpaceName
                        }
                      </p>

                      <p className="mt-0.5 font-mono text-xs text-neutral-500">
                        {
                          location.storageSpaceCode
                        }
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-neutral-600">
                      {location.warehouseName}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-xs font-medium text-neutral-600">
                        {location.storageType}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-mono text-sm text-neutral-950">
                      {formatQuantity(
                        location.quantity,
                      )}{" "}
                      <span className="font-sans text-xs text-neutral-500">
                        {item.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-950">
            Item details
          </h2>
        </div>

        <div className="grid gap-px bg-neutral-200 sm:grid-cols-2">
          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              SKU
            </p>

            <p className="mt-1 font-mono text-sm font-medium text-neutral-950">
              {item.sku}
            </p>
          </div>

          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Unit
            </p>

            <p className="mt-1 text-sm font-medium text-neutral-950">
              {item.unit}
            </p>
          </div>

          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Created
            </p>

            <p className="mt-1 text-sm font-medium text-neutral-950">
              {formatDate(item.createdAt)}
            </p>
          </div>

          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Last updated
            </p>

            <p className="mt-1 text-sm font-medium text-neutral-950">
              {formatDate(item.updatedAt)}
            </p>
          </div>
        </div>
      </section>

      {isAllocateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4"
          onClick={() => {
            if (!isAllocating) {
              setIsAllocateOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="allocate-dialog-title"
            onClick={(event) =>
              event.stopPropagation()
            }
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <h3
              id="allocate-dialog-title"
              className="text-base font-semibold text-neutral-950"
            >
              Allocate inventory
            </h3>

            <p className="mt-1 text-sm text-neutral-500">
              Enter the quantity of{" "}
              <span className="font-medium text-neutral-950">
                {item.name}
              </span>{" "}
              to allocate. Storage space is selected
              automatically based on the required
              storage type and available capacity.
            </p>

            <form
              onSubmit={handleAllocate}
              className="mt-5"
            >
              <div>
                <label
                  htmlFor="allocate-quantity"
                  className="mb-2 block text-sm font-medium text-neutral-800"
                >
                  Quantity ({item.unit})
                </label>

                <input
                  id="allocate-quantity"
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                  autoFocus
                  placeholder="100"
                  disabled={isAllocating}
                  className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 font-mono text-sm text-neutral-950 outline-none placeholder:font-sans placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
                />
              </div>

              {allocateError ? (
                <div
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  {allocateError}
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-100 pt-5">
                <button
                  type="button"
                  onClick={() =>
                    setIsAllocateOpen(false)
                  }
                  disabled={isAllocating}
                  className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isAllocating}
                  className="inline-flex h-10 items-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAllocating
                    ? "Allocating..."
                    : "Allocate inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ItemDetailPage;
