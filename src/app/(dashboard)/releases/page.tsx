"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  PackageOpen,
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

type ReleaseResultResponse = {
  itemId: string;
  storageSpaceId: string;
  releasedQuantity: string;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

const QUANTITY_PATTERN = /^\d{1,9}(\.\d{1,3})?$/;

const formatQuantity = (value: string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const ReleasesWorkspace = () => {
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

  const [selectedLocationId, setSelectedLocationId] =
    useState("");
  const [quantity, setQuantity] = useState("");
  const [formError, setFormError] = useState("");
  const [isReleasing, setIsReleasing] =
    useState(false);

  type ReleaseSnapshot = {
    release: ReleaseResultResponse;
    beforeQuantity: string;
    afterQuantity: string;
  };

  const [result, setResult] =
    useState<ReleaseSnapshot | null>(null);

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

    return data.data;
  };

  const selectItem = async (itemId: string) => {
    setSelectedItemId(itemId);
    setItem(null);
    setSummary(null);
    setResult(null);
    setSelectedLocationId("");
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
         * /releases?itemId=...
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

  const locations = summary?.locations ?? [];

  const selectedLocation = locations.find(
    (location) =>
      location.storageSpaceId ===
      selectedLocationId,
  );

  const handleRelease = async (
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
        "Quantity must be a valid decimal with up to 9 integer digits and 3 decimal places.",
      );
      return;
    }

    if (!selectedLocationId) {
      setFormError(
        "Select a storage location to release from.",
      );
      return;
    }

    setIsReleasing(true);

    try {
      /*
       * Snapshot before submitting; the refetch after
       * the release is authoritative for the
       * resulting state.
       */
      const beforeQuantity =
        locations.find(
          (location) =>
            location.storageSpaceId ===
            selectedLocationId,
        )?.quantity ?? "0";

      const response = await fetch(
        "/api/releases",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            itemId: item.id,
            storageSpaceId: selectedLocationId,
            quantity: trimmedQuantity,
          }),
        },
      );

      const data = (await response.json()) as
        | { data: ReleaseResultResponse }
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ??
                "Unable to release inventory."
            : "Unable to release inventory.",
        );
      }

      if (
        !("data" in data) ||
        !("releasedQuantity" in data.data)
      ) {
        throw new Error(
          "Invalid release response.",
        );
      }

      let afterQuantity = "0";

      try {
        const after = await loadSummary(item.id);

        afterQuantity =
          after.locations.find(
            (location) =>
              location.storageSpaceId ===
              selectedLocationId,
          )?.quantity ?? "0";
      } catch {
        setInventoryError(
          "Release succeeded, but the inventory overview could not be refreshed.",
        );
      }

      setResult({
        release: data.data,
        beforeQuantity,
        afterQuantity,
      });
      setQuantity("");
      setSelectedLocationId("");
    } catch (releaseError) {
      setFormError(
        releaseError instanceof Error
          ? releaseError.message
          : "Unable to release inventory.",
      );
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
          Release inventory
        </h1>

        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 ">
          Remove allocated inventory from a storage
          location.
        </p>
      </div>

      {itemsError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300 "
        >
          {itemsError}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-neutral-900">
          <div className="flex items-start gap-3 border-b border-neutral-100 dark:border-neutral-800 px-5 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400 " />

            <div>
              <h2 className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">
                Release successful
              </h2>

              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 ">
                {formatQuantity(
                  result.release.releasedQuantity,
                )}{" "}
                {item?.unit ?? "units"} released
              </p>
            </div>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
              Storage location
            </p>

            <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <p className="text-sm font-medium text-neutral-950 dark:text-neutral-100">
                {
                  summary?.locations.find(
                    (location) =>
                      location.storageSpaceId ===
                      result.release
                        .storageSpaceId,
                  )?.storageSpaceName ??
                    "Storage location"
                }
              </p>

              <dl className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
                    Before
                  </dt>

                  <dd className="font-mono text-sm text-neutral-950 dark:text-neutral-100">
                    {formatQuantity(
                      result.beforeQuantity,
                    )}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
                    After
                  </dt>

                  <dd className="font-mono text-sm text-neutral-950 dark:text-neutral-100">
                    {formatQuantity(
                      result.afterQuantity,
                    )}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 ">
                Quantities reflect the item&apos;s
                current allocation summary.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800 px-5 py-4">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setQuantity("");
              }}
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-950 dark:hover:text-neutral-100"
            >
              Release more
            </button>

            {item ? (
              <Link
                href={`/items/${item.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 dark:bg-neutral-100 px-4 text-sm font-medium text-white dark:text-neutral-950 transition hover:bg-neutral-800 dark:hover:bg-white"
              >
                View item
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleRelease}
          className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="item"
                className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200 "
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
                  isReleasing ||
                  items.length === 0
                }
                className="h-11 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
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
                    {option.name} — {option.sku}
                  </option>
                ))}
              </select>
            </div>

            {isLoadingItem ? (
              <div className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="h-4 w-40 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />

                <div className="h-3 w-24 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />

                <div className="h-16 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
              </div>
            ) : item ? (
              <>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">
                        {item.name}
                      </p>

                      <p className="mt-0.5 font-mono text-xs text-neutral-500 dark:text-neutral-400 ">
                        {item.sku}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
                        Current inventory
                      </p>

                      <p className="mt-0.5 text-lg font-semibold text-neutral-950 dark:text-neutral-100">
                        {formatQuantity(
                          summary?.totalQuantity ??
                            "0",
                        )}{" "}
                        <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400 ">
                          {item.unit}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200 "
                  >
                    Storage location
                  </label>

                  <select
                    id="location"
                    value={selectedLocationId}
                    onChange={(event) =>
                      setSelectedLocationId(
                        event.target.value,
                      )
                    }
                    disabled={
                      isReleasing ||
                      locations.length === 0
                    }
                    className="h-11 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
                  >
                    <option value="">
                      {locations.length === 0
                        ? "No allocated locations"
                        : "Select a location"}
                    </option>

                    {locations.map((location) => (
                      <option
                        key={
                          location.storageSpaceId
                        }
                        value={
                          location.storageSpaceId
                        }
                      >
                        {
                          location.storageSpaceName
                        }{" "}
                        —{" "}
                        {
                          location.storageSpaceCode
                        }
                      </option>
                    ))}
                  </select>

                  {selectedLocation ? (
                    <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
                        Allocated here
                      </p>

                      <p className="mt-1 text-lg font-semibold text-neutral-950 dark:text-neutral-100">
                        {formatQuantity(
                          selectedLocation.quantity,
                        )}{" "}
                        <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400 ">
                          {item.unit}
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 ">
                        {selectedLocation.warehouseName}{" "}
                        ·{" "}
                        {
                          selectedLocation.storageType
                        }
                      </p>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="quantity"
                    className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200 "
                  >
                    Quantity to release
                  </label>

                  <input
                    id="quantity"
                    type="text"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    placeholder="25.000"
                    disabled={isReleasing}
                    className="h-11 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 font-mono text-sm text-neutral-950 dark:text-neutral-100 outline-none placeholder:font-sans placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
                  />
                </div>

                {inventoryError ? (
                  <p
                    role="alert"
                    className="text-xs text-red-600 dark:text-red-400 "
                  >
                    {inventoryError}
                  </p>
                ) : null}

                {formError ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 "
                  >
                    {formError}
                  </div>
                ) : null}
              </>
            ) : itemError ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 "
              >
                {itemError}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 ">
                Select an item to choose a storage
                location.
              </p>
            )}
          </div>

          {item ? (
            <div className="mt-6 flex items-center justify-end border-t border-neutral-100 dark:border-neutral-800 pt-5">
              <button
                type="submit"
                disabled={
                  isReleasing || !selectedLocationId
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 dark:bg-neutral-100 px-4 text-sm font-medium text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReleasing ? (
                  "Releasing..."
                ) : (
                  <>
                    <PackageOpen className="h-4 w-4" />
                    Release inventory
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

const ReleasesPage = () => {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl space-y-6">
          <div className="h-8 w-56 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 " />

          <div className="h-96 animate-pulse rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" />
        </div>
      }
    >
      <ReleasesWorkspace />
    </Suspense>
  );
};

export default ReleasesPage;
