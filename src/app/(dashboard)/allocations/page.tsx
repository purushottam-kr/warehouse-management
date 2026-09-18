"use client";

import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  FormEvent,
  useEffect,
  useState,
} from "react";

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

type AllocationResultResponse = {
  itemId: string;
  requestedQuantity: string;
  allocations: Array<{
    storageSpaceId: string;
    quantity: string;
  }>;
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

const AllocationsWorkspace = () => {
  const searchParams = useSearchParams();

  const [items, setItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] =
    useState(true);
  const [itemsError, setItemsError] = useState("");

  const [selectedItemId, setSelectedItemId] =
    useState("");
  const [item, setItem] = useState<Item | null>(null);
  const [summary, setSummary] =
    useState<ItemAllocationSummary | null>(null);

  const [isLoadingItem, setIsLoadingItem] =
    useState(false);
  const [itemError, setItemError] = useState("");
  const [inventoryError, setInventoryError] =
    useState("");

  const [quantity, setQuantity] = useState("");
  const [formError, setFormError] = useState("");
  const [isAllocating, setIsAllocating] =
    useState(false);

  const [result, setResult] =
    useState<AllocationResultResponse | null>(null);

  const loadSummary = async (itemId: string) => {
    const response = await fetch(
      `/api/items/${itemId}/allocations`,
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

  const selectItem = async (itemId: string) => {
    setSelectedItemId(itemId);
    setItem(null);
    setSummary(null);
    setResult(null);
    setQuantity("");
    setFormError("");
    setItemError("");
    setInventoryError("");

    if (!itemId) {
      return;
    }

    setIsLoadingItem(true);

    try {
      const itemResponse = await fetch(
        `/api/items/${itemId}`,
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

      const loadedItem = itemData.data;

      setItem(loadedItem);

      /*
       * A deep-linked item may be missing from the
       * dropdown list; add it so the select displays
       * the correct label.
       */
      setItems((currentItems) =>
        currentItems.some(
          (entry) => entry.id === loadedItem.id,
        )
          ? currentItems
          : [loadedItem, ...currentItems],
      );

      try {
        await loadSummary(itemId);
      } catch (summaryError) {
        setInventoryError(
          summaryError instanceof Error
            ? summaryError.message
            : "Unable to load inventory.",
        );
      }
    } catch (loadError) {
      setItemError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load item.",
      );
    } finally {
      setIsLoadingItem(false);
    }
  };

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await fetch("/api/items", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as
          | { data: Item[] }
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
      } catch (error) {
        setItemsError(
          error instanceof Error
            ? error.message
            : "Unable to load items.",
        );
      } finally {
        setIsLoadingItems(false);

        /*
         * Preselect an item linked from
         * /allocations?itemId=...
         *
         * Runs in the async continuation so a deep
         * link preselects even if the list request
         * failed.
         */
        const preselectedItemId =
          searchParams.get("itemId");

        if (preselectedItemId) {
          await selectItem(preselectedItemId);
        }
      }
    };

    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAllocate = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setFormError("");

    if (!item) {
      return;
    }

    const trimmedQuantity = quantity.trim();

    if (
      !QUANTITY_PATTERN.test(trimmedQuantity) ||
      Number(trimmedQuantity) <= 0
    ) {
      setFormError(
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
            itemId: item.id,
            quantity: trimmedQuantity,
          }),
        },
      );

      const data = (await response.json()) as
        | AllocationResultResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ??
                "Unable to allocate inventory."
            : "Unable to allocate inventory.",
        );
      }

      if (
        !("itemId" in data) ||
        !("requestedQuantity" in data) ||
        !("allocations" in data)
      ) {
        throw new Error(
          "Invalid allocation response.",
        );
      }

      /*
       * The POST response is authoritative for where
       * this allocation went; the summary refetch is
       * authoritative for the resulting state.
       */
      setResult(data);
      setQuantity("");

      try {
        await loadSummary(item.id);
      } catch {
        setInventoryError(
          "Allocation succeeded, but the inventory overview could not be refreshed.",
        );
      }
    } catch (allocateError) {
      setFormError(
        allocateError instanceof Error
          ? allocateError.message
          : "Unable to allocate inventory.",
      );
    } finally {
      setIsAllocating(false);
    }
  };

  const summaryLocations = summary?.locations ?? [];

  const locationById = new Map(
    summaryLocations.map((location) => [
      location.storageSpaceId,
      location,
    ]),
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
          Allocate inventory
        </h1>

        <p className="mt-1 text-sm text-neutral-500">
          Allocate an item into available warehouse
          capacity.
        </p>
      </div>

      {itemsError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {itemsError}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-emerald-200 bg-white">
          <div className="flex items-start gap-3 border-b border-neutral-100 px-5 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />

            <div>
              <h2 className="text-sm font-semibold text-neutral-950">
                Allocation successful
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                {formatQuantity(
                  result.requestedQuantity,
                )}{" "}
                {item?.unit ?? "units"} allocated.
              </p>
            </div>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Storage locations
            </p>

            <ul className="mt-3 divide-y divide-neutral-100">
              {result.allocations.map(
                (allocation) => {
                  const location =
                    locationById.get(
                      allocation.storageSpaceId,
                    );

                  return (
                    <li
                      key={
                        allocation.storageSpaceId
                      }
                      className="flex items-center justify-between gap-4 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-950">
                          {location
                            ? location.storageSpaceName
                            : "Storage space"}
                        </p>

                        {location ? (
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {
                              location.warehouseName
                            }
                          </p>
                        ) : null}
                      </div>

                      <p className="font-mono text-sm text-neutral-950">
                        {formatQuantity(
                          allocation.quantity,
                        )}
                      </p>
                    </li>
                  );
                },
              )}
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-5 py-4">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setQuantity("");
              }}
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            >
              Allocate more
            </button>

            {item ? (
              <Link
                href={`/items/${item.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                View item
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleAllocate}
          className="rounded-xl border border-neutral-200 bg-white p-6"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="item"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Item
              </label>

              <select
                id="item"
                value={selectedItemId}
                onChange={(event) =>
                  void selectItem(
                    event.target.value,
                  )
                }
                disabled={
                  isLoadingItems ||
                  isAllocating ||
                  items.length === 0
                }
                className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
              >
                <option value="">
                  {isLoadingItems
                    ? "Loading items..."
                    : "Select an item"}
                </option>

                {items.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                  >
                    {option.name} ({option.sku})
                  </option>
                ))}
              </select>
            </div>

            {isLoadingItem ? (
              <div className="space-y-3 rounded-lg border border-neutral-200 p-4">
                <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />

                <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />

                <div className="h-16 animate-pulse rounded bg-neutral-100" />
              </div>
            ) : item ? (
              <>
                <div className="rounded-lg border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-neutral-950">
                        {item.name}
                      </p>

                      <p className="mt-0.5 font-mono text-xs text-neutral-500">
                        {item.sku}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Current inventory
                      </p>

                      <p className="mt-0.5 text-lg font-semibold text-neutral-950">
                        {formatQuantity(
                          summary?.totalQuantity ??
                            "0",
                        )}{" "}
                        <span className="text-sm font-normal text-neutral-500">
                          {item.unit}
                        </span>
                      </p>
                    </div>
                  </div>

                  {inventoryError ? (
                    <p
                      role="alert"
                      className="mt-3 border-t border-neutral-100 pt-3 text-xs text-red-600"
                    >
                      {inventoryError}
                    </p>
                  ) : summaryLocations.length > 0 ? (
                    <div className="mt-4 border-t border-neutral-100 pt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Currently stored in
                      </p>

                      <ul className="mt-2 divide-y divide-neutral-100">
                        {summaryLocations.map(
                          (location) => (
                            <li
                              key={
                                location.storageSpaceId
                              }
                              className="flex items-center justify-between gap-4 py-1.5"
                            >
                              <p className="text-sm text-neutral-700">
                                {
                                  location.storageSpaceName
                                }

                                <span className="ml-2 font-mono text-xs text-neutral-400">
                                  {
                                    location.storageSpaceCode
                                  }
                                </span>
                              </p>

                              <p className="font-mono text-sm text-neutral-950">
                                {formatQuantity(
                                  location.quantity,
                                )}
                              </p>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                      No inventory allocated yet.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="quantity"
                    className="mb-2 block text-sm font-medium text-neutral-800"
                  >
                    Quantity to allocate
                  </label>

                  <input
                    id="quantity"
                    type="text"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    placeholder="100.000"
                    disabled={isAllocating}
                    className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 font-mono text-sm text-neutral-950 outline-none placeholder:font-sans placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
                  />

                  <p className="mt-1.5 text-xs text-neutral-500">
                    Storage spaces are chosen
                    automatically by required type and
                    available capacity; large
                    quantities may be split across
                    spaces.
                  </p>
                </div>

                <div>
                  <p className="mb-2 block text-sm font-medium text-neutral-800">
                    Required storage
                  </p>

                  {item.requiredStorageType ? (
                    <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-xs font-medium text-neutral-600">
                      {item.requiredStorageType}
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-500">
                      Any storage type
                    </span>
                  )}
                </div>

                {formError ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                  >
                    {formError}
                  </div>
                ) : null}
              </>
            ) : itemError ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {itemError}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Select an item to see its current
                inventory.
              </p>
            )}
          </div>

          {item ? (
            <div className="mt-6 flex items-center justify-end border-t border-neutral-100 pt-5">
              <button
                type="submit"
                disabled={isAllocating}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAllocating ? (
                  "Allocating..."
                ) : (
                  <>
                    <Boxes className="h-4 w-4" />
                    Allocate
                  </>
                )}
              </button>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
};

const AllocationsPage = () => {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl space-y-6">
          <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />

          <div className="h-96 animate-pulse rounded-xl border border-neutral-200 bg-white" />
        </div>
      }
    >
      <AllocationsWorkspace />
    </Suspense>
  );
};

export default AllocationsPage;
